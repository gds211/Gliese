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
import { PUBLIC_CONFIG } from "@/config/public";

// ===== Types =====

export type SwapArgs = {
  router: Address;
  tokenIn?: string;   // "MON" or address
  tokenOut?: string;  // symbol or address
  amountIn: bigint;
  amountOutMin: bigint;
  path: Address[];
  adapters: Address[];
};

// ===== Internals =====

const ZERO = "0x0000000000000000000000000000000000000000" as Address;

const isNative = (v?: string) =>
  !v || v.toUpperCase() === PUBLIC_CONFIG.NATIVE_SYMBOL || v === ZERO;

const toQuoteAddr = (v?: string) =>
  (isNative(v) ? (PUBLIC_CONFIG.WRAPPED_NATIVE as Address) : (v as Address));

async function ensureAllowance(
  client: any,
  token: Address,
  owner: Address,
  spender: Address,
  needed: bigint
) {
  const current = (await client.readContract({
    abi: ERC20_ABI,
    address: token,
    functionName: "allowance",
    args: [owner, spender],
  })) as bigint;

  if (current >= needed) return;

  const txHash = await writeContract(config, {
    abi: ERC20_ABI,
    address: token,
    functionName: "approve",
    args: [spender, needed],
    account: owner,
  });

  await waitForTransactionReceipt(config, { hash: txHash });
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

  assertRouteShape(args.path, args.adapters);

  // ----- Ensure allowance for ERC-20 input -----
  if (!inIsNative) {
    await ensureAllowance(client, tokenInAddr, address, router, args.amountIn);
  }

  // ----- Trade struct -----
  const trade = {
    amountIn:  args.amountIn,
    amountOut: args.amountOutMin, // minOut (slippage already applied by the hook)
    path:      args.path,
    adapters:  args.adapters,
  } as const;

  // ----- Read MIN_FEE & WNATIVE from router (avoid config drift) -----
  const [minFee, routerWnative] = await Promise.all([
    client.readContract({ address: router, abi: YAK_ROUTER_ABI, functionName: "MIN_FEE" }) as Promise<bigint>,
    client.readContract({ address: router, abi: YAK_ROUTER_ABI, functionName: "WNATIVE" }) as Promise<Address>,
  ]);

  // Fail early if your config WNATIVE doesn't match the router
  const cfgWN = PUBLIC_CONFIG.WRAPPED_NATIVE.toLowerCase();
  if (cfgWN !== routerWnative.toLowerCase()) {
    throw new Error(
      `WRAPPED_NATIVE mismatch: config=${PUBLIC_CONFIG.WRAPPED_NATIVE} router.WNATIVE=${routerWnative}. ` +
      `Fix PUBLIC_CONFIG.WRAPPED_NATIVE to match the router deployment.`
    );
  }

  // Yak fee denominator is 1e4; use the higher of our default (2 bps) or router.MIN_FEE.
  const DEFAULT_FEE_BPS = 2n;
  const FEE_BPS = minFee > DEFAULT_FEE_BPS ? minFee : DEFAULT_FEE_BPS;

  // ----- Choose function name & value -----
  let functionName: "swapNoSplit" | "swapNoSplitFromAVAX" | "swapNoSplitToAVAX" = "swapNoSplit";
  let value: bigint | undefined = undefined;

  if (inIsNative && !outIsNative) {
    if (args.path[0].toLowerCase() !== routerWnative.toLowerCase()) {
      throw new Error("Route invalid for native input: path[0] must equal router.WNATIVE.");
    }
    functionName = "swapNoSplitFromAVAX";
    value = args.amountIn;
  } else if (!inIsNative && outIsNative) {
    const last = args.path[args.path.length - 1];
    if (last.toLowerCase() !== routerWnative.toLowerCase()) {
      throw new Error("Route invalid for native output: last path hop must equal router.WNATIVE.");
    }
    functionName = "swapNoSplitToAVAX";
  } else {
    functionName = "swapNoSplit";
  }

  // ----- Preflight simulation (catch Yak revert reasons *before* opening wallet) -----
  try {
    await client.simulateContract({
      account: address,
      address: router,
      abi: YAK_ROUTER_ABI,
      functionName,
      args: [trade, address, FEE_BPS],
      value,
    });
  } catch (e: any) {
    const msg = (e?.shortMessage || e?.message || String(e)).toLowerCase();
    if (msg.includes("invalid max-steps")) {
      throw new Error("YakRouter revert: Invalid max-steps (must be 1..4).");
    }
    if (msg.includes("insufficient output amount")) {
      throw new Error("YakRouter revert: Insufficient output amount. Refresh your quote or increase slippage.");
    }
    if (msg.includes("insufficient fee")) {
      throw new Error(`YakRouter revert: Insufficient fee. Router MIN_FEE=${minFee} bps; using ${FEE_BPS} bps.`);
    }
    if (msg.includes("begin with wavax")) {
      throw new Error("YakRouter revert: Path must begin with WNATIVE for native input.");
    }
    if (msg.includes("end with wavax")) {
      throw new Error("YakRouter revert: Path must end with WNATIVE for native output.");
    }
    throw e;
  }

  // ----- Actual write -----
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
