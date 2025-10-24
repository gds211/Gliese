// src/lib/swap.ts
import type { Address, Hash } from "viem";
import { encodeFunctionData } from "viem";
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
import { MULTICALL3_ABI } from "@/abi/multicall3";


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

export type SplitLegInput = {
  amountIn: bigint;           // per-leg input
  minAmountOut: bigint;       // per-leg minOut after slippage
  adapter: Address;           // direct adapter
  path: Address[];            // [tokenIn, tokenOut]
  isNativeIn: boolean;        // true => use swapNoSplitFromAVAX (payable)
  isNativeOut: boolean;       // true => use swapNoSplitToAVAX
};

export type SplitMulticallArgs = {
  router: Address;
  multicall3: Address;        // PUBLIC_CONFIG.SPLIT_TRADES.MULTICALL3_ADDRESS
  legs: [SplitLegInput, SplitLegInput];
  wnative: Address;           // PUBLIC_CONFIG.WRAPPED_NATIVE
};

/**
 * Atomic two-leg split using Multicall3.aggregate3Value.
 * Each leg is a standard Yak swapNoSplit* call; both execute in a single transaction.
 * NOTE: The router fee is still applied per call (so twice).
 */
export async function performSplitSwapMulticall({
  router,
  multicall3,
  legs,
  wnative,
}: SplitMulticallArgs) {
  const { address } = getAccount(config);
  if (!address) throw new Error("Wallet not connected.");

  // Hard gate via config
  if (!(PUBLIC_CONFIG as any).SPLIT_TRADES?.EXECUTION?.ENABLED) {
    throw new Error("Split execution is disabled. Enable PUBLIC_CONFIG.SPLIT_TRADES.EXECUTION.ENABLED first.");
  }

  const client = getPublicClient(config);

  // Sanity: Router constants
  const [routerWN, minFee] = await Promise.all([
    client.readContract({ address: router, abi: YAK_ROUTER_ABI, functionName: "WNATIVE" }) as Promise<Address>,
    client.readContract({ address: router, abi: YAK_ROUTER_ABI, functionName: "MIN_FEE" }) as Promise<bigint>,
  ]);

  if (routerWN.toLowerCase() !== wnative.toLowerCase()) {
    throw new Error(`Router.WNATIVE mismatch: router=${routerWN} app=${wnative}`);
  }
  const DEFAULT_FEE_BPS = 2n;
  const FEE_BPS = minFee > DEFAULT_FEE_BPS ? minFee : DEFAULT_FEE_BPS;

  // If ERC-20 input, approve the sum once
  const erc20TokenIn =
    !legs[0].isNativeIn ? legs[0].path[0] :
    !legs[1].isNativeIn ? legs[1].path[0] : null;

  if (erc20TokenIn) {
    const totalIn =
      (legs[0].isNativeIn ? 0n : legs[0].amountIn) +
      (legs[1].isNativeIn ? 0n : legs[1].amountIn);
    await ensureAllowance(client, erc20TokenIn as Address, address, router, totalIn);
  }

  // Build per-leg encoded calls
  function buildLeg(leg: SplitLegInput) {
    // Validate native path ends/begins with WNATIVE where applicable
    if (leg.isNativeIn && leg.path[0].toLowerCase() !== routerWN.toLowerCase()) {
      throw new Error("Native input leg requires path[0] == WNATIVE.");
    }
    if (leg.isNativeOut && leg.path[leg.path.length - 1].toLowerCase() !== routerWN.toLowerCase()) {
      throw new Error("Native output leg requires last path hop == WNATIVE.");
    }

    const trade = {
      amountIn: leg.amountIn,
      amountOut: leg.minAmountOut,
      path: leg.path,
      adapters: [leg.adapter],
    } as const;

    let fn: "swapNoSplit" | "swapNoSplitFromAVAX" | "swapNoSplitToAVAX";
    let value: bigint = 0n;

    if (leg.isNativeIn && !leg.isNativeOut) {
      fn = "swapNoSplitFromAVAX";
      value = leg.amountIn; // payable value sent to router for this leg
    } else if (!leg.isNativeIn && leg.isNativeOut) {
      fn = "swapNoSplitToAVAX";
    } else {
      fn = "swapNoSplit";
    }

    const callData = encodeFunctionData({
      abi: YAK_ROUTER_ABI,
      functionName: fn,
      args: [trade, address, FEE_BPS],
    });

    return { target: router, allowFailure: false, value, callData };
  }

  const c1 = buildLeg(legs[0]);
  const c2 = buildLeg(legs[1]);

  const totalValue = (c1.value ?? 0n) + (c2.value ?? 0n);

  // Simulate the aggregated call (catches reverts from either leg)
  await client.simulateContract({
    account: address,
    address: multicall3,
    abi: MULTICALL3_ABI,
    functionName: "aggregate3Value",
    args: [[c1, c2]],
    value: totalValue,
  });

  // Execute the aggregated call
  const txHash: Hash = await writeContract(config, {
    account: address,
    address: multicall3,
    abi: MULTICALL3_ABI,
    functionName: "aggregate3Value",
    args: [[c1, c2]],
    value: totalValue,
  });

  const receipt = await waitForTransactionReceipt(config, { hash: txHash });
  return receipt;
}
