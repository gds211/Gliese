// src/lib/swap.ts
import type { Address, Hash } from "viem";
import {
  getAccount,
  getPublicClient,
  writeContract,
  waitForTransactionReceipt,
} from "wagmi/actions";
import { config } from "@/config/wagmi";
import { ERC20_ABI } from "@/abi/erc20";
import { YAK_ROUTER_ABI } from "@/abi/yakRouter";
import { YAK_SPLIT_WRAPPER_ABI } from "@/abi/yakSplitWrapper";
import { PUBLIC_CONFIG } from "@/config/public";
import type { SplitPlan } from "@/lib/splitQuote";

// ===== Types =====
export type SwapArgs = {
  router: Address;
  tokenIn: string;   // may be native symbol like "MON"
  tokenOut: string;  // may be native symbol like "MON"
  amountIn: bigint;  // for single-route mode
  amountOutMin: bigint;
  path?: Address[];
  adapters?: Address[];
  // If provided, overrides single-route execution and uses the wrapper
  splitPlan?: SplitPlan | null;
};

// ===== Internals =====
const ZERO = "0x0000000000000000000000000000000000000000";
const isNative = (v?: string) =>
  !v || v.toUpperCase() === PUBLIC_CONFIG.NATIVE_SYMBOL || v === ZERO;

async function ensureAllowance(spender: Address, token: Address, owner: Address, minAmount: bigint) {
  const client = getPublicClient(config);
  const current: bigint = await client.readContract({
    address: token,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [owner, spender],
  }) as any;

  if (current >= minAmount) return;

  await writeContract(config, {
    account: owner,
    address: token,
    abi: ERC20_ABI,
    functionName: "approve",
    args: [spender, minAmount],
  });
}

// ===== Main =====
export async function performSwap(args: SwapArgs) {
  const { router } = args;
  const { address } = getAccount(config);
  if (!address) throw new Error("Wallet not connected");

  const client = getPublicClient(config);
  const inIsNative  = isNative(args.tokenIn);
  const outIsNative = isNative(args.tokenOut);
  const routerWnative = PUBLIC_CONFIG.WRAPPED_NATIVE as Address;

  // ---- SPLIT MODE ----
  if (args.splitPlan) {
    const plan = args.splitPlan;

    // Wrapper in your splitter.txt is ERC20-only in/out. (No native.)
    if (inIsNative || outIsNative) throw new Error("Split mode requires ERC20 input/output (no native).");

    const tokenInAddr  = args.tokenIn as Address;
    const tokenOutAddr = args.tokenOut as Address;

    // Tight allowance to wrapper for total input
    await ensureAllowance(plan.wrapper as Address, tokenInAddr, address as Address, plan.totalIn);

    const legs = plan.legs.map(l => ({ target: l.target, callData: l.callData, amountIn: l.amountIn }));

    const txHash: Hash = await writeContract(config, {
      account: address,
      address: plan.wrapper as Address,
      abi: YAK_SPLIT_WRAPPER_ABI,
      functionName: "splitSwapExactIn",
      args: [
        tokenInAddr,
        tokenOutAddr,
        plan.totalIn,
        plan.minTotalOut,
        address,
        plan.deadline,
        legs,
      ],
    });

    const receipt = await waitForTransactionReceipt(config, { hash: txHash });
    return receipt;
  }

  // ---- SINGLE-ROUTE MODE ----
  const inAddr  = inIsNative ? routerWnative : (args.tokenIn as Address);
  const outAddr = outIsNative ? routerWnative : (args.tokenOut as Address);

  // Validate route shape
  const { path, adapters } = args;
  if (!path?.length || adapters?.length !== path.length - 1) {
    throw new Error("Invalid route: path/adapters mismatch.");
  }

  // Approvals if ERC20 input
  if (!inIsNative) {
    await ensureAllowance(router, inAddr, address as Address, args.amountIn);
  }

  const DEFAULT_FEE_BPS = PUBLIC_CONFIG.FEE_BPS ?? 0;
  const minFee = PUBLIC_CONFIG.MIN_FEE_BPS ?? 0;
  const FEE_BPS = minFee > DEFAULT_FEE_BPS ? minFee : DEFAULT_FEE_BPS;

  // Choose function name & value
  let functionName: "swapNoSplit" | "swapNoSplitFromAVAX" | "swapNoSplitToAVAX" = "swapNoSplit";
  let value: bigint | undefined = undefined;

  if (inIsNative && !outIsNative) {
    if (path[0].toLowerCase() !== routerWnative.toLowerCase()) {
      throw new Error("Route invalid for native input: path[0] must equal router.WNATIVE.");
    }
    functionName = "swapNoSplitFromAVAX";
    value = args.amountIn;
  } else if (!inIsNative && outIsNative) {
    const last = path[path.length - 1];
    if (last.toLowerCase() !== routerWnative.toLowerCase()) {
      throw new Error("Route invalid for native output: last path hop must equal router.WNATIVE.");
    }
    functionName = "swapNoSplitToAVAX";
  } else {
    functionName = "swapNoSplit";
  }

  const trade = {
    amountIn: args.amountIn,
    amountOut: args.amountOutMin,
    path: path as Address[],
    adapters: adapters as Address[],
  };

  // Preflight simulate
  await client.simulateContract({
    account: address,
    address: router,
    abi: YAK_ROUTER_ABI,
    functionName,
    args: [trade, address, FEE_BPS],
    value,
  });

  // Send
  const txHash: Hash = await writeContract(config, {
    account: address,
    address: router,
    abi: YAK_ROUTER_ABI,
    functionName,
    args: [trade, address, FEE_BPS],
    value,
  });

  const receipt = await waitForTransactionReceipt(config, { hash: txHash });
  return receipt;
}
