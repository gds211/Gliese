// src/lib/swap.ts
import type { Address, Hash } from "viem";
import { getAccount, getPublicClient, writeContract, waitForTransactionReceipt } from "wagmi/actions";
import { config } from "@/config/wagmi";
import { ERC20_ABI } from "@/abi/erc20";
import { YAK_ROUTER_ABI } from "@/abi/yakRouter";
import { PUBLIC_CONFIG } from "@/config/public";

// ===== Types =====
export type SwapArgs = {
  router: Address;
  tokenIn: string;     // ERC20 address OR native symbol
  tokenOut: string;    // ERC20 address OR native symbol
  amountIn: bigint;
  amountOutMin: bigint; // already slippage-adjusted
  path: Address[];
  adapters: Address[];
  // Optional split legs from the quote hook
  split?: {
    isSplit: boolean;
    legA?: { amountIn: bigint; minOut: bigint; path: Address[]; adapters: Address[] };
    legB?: { amountIn: bigint; minOut: bigint; path: Address[]; adapters: Address[] };
    minTotalOut?: bigint;
  };
};

const ZERO = "0x0000000000000000000000000000000000000000";
const isNative = (v?: string) => !v || v.toUpperCase() === PUBLIC_CONFIG.NATIVE_SYMBOL || v === ZERO;
const toQuoteAddr = (v?: string) => (isNative(v) ? ZERO : (v as Address));

async function ensureAllowance(
  client: ReturnType<typeof getPublicClient>,
  token: Address,
  owner: Address,
  spender: Address,
  needed: bigint
) {
  const allowance: bigint = await (client as any).readContract({
    address: token,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [owner, spender],
  });
  if (allowance >= needed) return;
  // Approve max to reduce tx churn
  await (client as any).writeContract({
    account: owner,
    address: token,
    abi: ERC20_ABI,
    functionName: "approve",
    args: [spender, 2n ** 256n - 1n],
  });
}

function assertRouteShape(path: Address[], adapters: Address[]) {
  if (!path?.length || adapters?.length !== path.length - 1) {
    throw new Error("Invalid route (path/adapters mismatch).");
  }
}

export async function performSwap(args: SwapArgs) {
  const { address } = getAccount(config);
  if (!address) throw new Error("Wallet not connected.");

  const router = args.router as Address;
  const client = getPublicClient(config);

  const inIsNative  = isNative(args.tokenIn);
  const outIsNative = isNative(args.tokenOut);

  const tokenInAddr = toQuoteAddr(args.tokenIn) as Address;

  // ----- Ensure allowance for ERC-20 input (single or split) -----
  if (!inIsNative) {
    // For split we still approve the total amount, which equals args.amountIn
    await ensureAllowance(client, tokenInAddr, address, router, args.amountIn);
  }

  // Common: fetch WNATIVE from router to validate native wrappers
  const routerWnative: Address = await (client as any).readContract({
    address: router, abi: YAK_ROUTER_ABI, functionName: "WNATIVE", args: []
  });

  // Decide if we are executing a split
  const doSplit = Boolean(args.split?.isSplit && args.split.legA && args.split.legB);

  // ----- Build trade structs -----
  const tradeSingle = {
    amountIn:  args.amountIn,
    amountOut: args.amountOutMin,
    path:      args.path,
    adapters:  args.adapters,
  };

  const legA = doSplit ? {
    amountIn:  args.split!.legA!.amountIn,
    amountOut: args.split!.legA!.minOut,
    path:      args.split!.legA!.path,
    adapters:  args.split!.legA!.adapters,
  } : undefined;

  const legB = doSplit ? {
    amountIn:  args.split!.legB!.amountIn,
    amountOut: args.split!.legB!.minOut,
    path:      args.split!.legB!.path,
    adapters:  args.split!.legB!.adapters,
  } : undefined;

  const minTotalOut = doSplit ? (args.split!.minTotalOut ?? (legA!.amountOut + legB!.amountOut)) : 0n;

  // ----- Choose function name & value -----
  type FnSingle = "swapNoSplit" | "swapNoSplitFromAVAX" | "swapNoSplitToAVAX";
  type FnSplit  = "swapSplit" | "swapSplitFromAVAX" | "swapSplitToAVAX";

  let functionNameSingle: FnSingle = "swapNoSplit";
  let functionNameSplit:  FnSplit  = "swapSplit";
  let value: bigint | undefined = undefined;

  if (inIsNative && !outIsNative) {
    // Native input: first hop must be WNATIVE
    if (args.path?.length && args.path[0].toLowerCase() !== routerWnative.toLowerCase()) {
      // Only validate for single path; split validation happens per leg below
    }
    functionNameSingle = "swapNoSplitFromAVAX";
    functionNameSplit  = "swapSplitFromAVAX";
    value = args.amountIn;
  } else if (!inIsNative && outIsNative) {
    // Native output: last hop must be WNATIVE
    const last = args.path?.[args.path.length - 1];
    if (last && last.toLowerCase() !== routerWnative.toLowerCase()) {
      // Only validate for single path; split validation happens per leg below
    }
    functionNameSingle = "swapNoSplitToAVAX";
    functionNameSplit  = "swapSplitToAVAX";
  } else {
    functionNameSingle = "swapNoSplit";
    functionNameSplit  = "swapSplit";
  }

  // Extra validations for split legs (mirror router’s require()s)
  if (doSplit) {
    // Same tokenIn and same tokenOut across legs (UI/quote always ensures this)
    if (legA!.path[0].toLowerCase() !== legB!.path[0].toLowerCase()) throw new Error("Split: tokenIn mismatch between legs.");
    const aOutT = legA!.path[legA!.path.length - 1].toLowerCase();
    const bOutT = legB!.path[legB!.path.length - 1].toLowerCase();
    if (aOutT !== bOutT) throw new Error("Split: tokenOut mismatch between legs.");
    // Native wrappers if needed
    if (functionNameSplit === "swapSplitFromAVAX") {
      if (legA!.path[0].toLowerCase() !== routerWnative.toLowerCase() || legB!.path[0].toLowerCase() !== routerWnative.toLowerCase()) {
        throw new Error("SplitFromNative: paths must begin with WNATIVE.");
      }
      value = args.amountIn; // total native sent once
    }
    if (functionNameSplit === "swapSplitToAVAX") {
      if (aOutT !== routerWnative.toLowerCase()) throw new Error("SplitToNative: paths must end with WNATIVE.");
    }
  } else {
    // Single route must be well-formed
    assertRouteShape(args.path, args.adapters);
  }

  // Determine min fee (bps)
  const minFee: bigint = await (client as any).readContract({
    address: router, abi: YAK_ROUTER_ABI, functionName: "MIN_FEE", args: []
  });
  const DEFAULT_FEE_BPS = 2n; // fallback to your current MIN_FEE default
  const FEE_BPS = minFee > DEFAULT_FEE_BPS ? minFee : DEFAULT_FEE_BPS;

  // ----- Simulate -----
  try {
    if (doSplit) {
      await client.simulateContract({
        account: address, address: router, abi: YAK_ROUTER_ABI,
        functionName: functionNameSplit,
        args: [ legA!, legB!, address, minTotalOut, FEE_BPS ],
        value,
      });
    } else {
      await client.simulateContract({
        account: address, address: router, abi: YAK_ROUTER_ABI,
        functionName: functionNameSingle,
        args: [ tradeSingle, address, FEE_BPS ],
        value,
      });
    }
  } catch (e) {
    // Surface the revert cleanly
    throw e;
  }

  // ----- Write -----
  const txHash: Hash = await writeContract(config, {
    account: address, address: router, abi: YAK_ROUTER_ABI,
    functionName: doSplit ? functionNameSplit : functionNameSingle,
    args: doSplit
      ? [ legA!, legB!, address, minTotalOut, FEE_BPS ]
      : [ tradeSingle, address, FEE_BPS ],
    value,
  });

  const receipt = await waitForTransactionReceipt(config, { hash: txHash });
  return receipt;
}
