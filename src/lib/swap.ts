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
import { MULTICALL3_ABI } from "@/abi/multicall3";
import { PUBLIC_CONFIG } from "@/config/public";

/* =========================
 * Types
 * ========================= */

export type SwapArgs = {
  router: Address;
  tokenIn?: string;   // "MON" or address
  tokenOut?: string;  // symbol or address
  amountIn: bigint;
  amountOutMin: bigint;
  path: Address[];
  adapters: Address[];
};

export type SplitSwapLegInput = {
  adapter: Address;
  amountInWei: bigint;
  minAmountOutWei: bigint;
};

/* =========================
 * Internals
 * ========================= */

const ZERO = "0x0000000000000000000000000000000000000000" as Address;

const isNative = (v?: string) =>
  !v || v.toUpperCase() === PUBLIC_CONFIG.NATIVE_SYMBOL || v === ZERO;

const toQuoteAddr = (v?: string) =>
  (isNative(v) ? (PUBLIC_CONFIG.WRAPPED_NATIVE as Address) : (v as Address));

function assertRouteShape(path: Address[], adapters: Address[]) {
  if (!path?.length || adapters?.length !== path.length - 1) {
    throw new Error("Invalid route (path/adapters mismatch).");
  }
}

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

/* =========================
 * Single-route swap (no split)
 * ========================= */

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

  // ----- Preflight simulation -----
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

/* =========================
 * Split swap (two legs, atomic via Multicall3)
 * Each leg is a single-hop adapter path: [tokenIn, tokenOut]
 * ========================= */

export async function performSplitSwap(params: {
  router: Address;
  multicall: Address;
  tokenIn: Address | string;
  tokenOut: Address | string;
  legs: [SplitSwapLegInput, SplitSwapLegInput];
  feeBps?: bigint; // falls back to router.MIN_FEE vs default like single swap
}) {
  const { address } = getAccount(config);
  if (!address) throw new Error("Wallet not connected.");

  const client = getPublicClient(config);
  const router = params.router as Address;
  const multicallAddr = params.multicall as Address;

  // Read fee + WNATIVE to keep consistent with router deployment
  const [minFee, routerWnative] = await Promise.all([
    client.readContract({ address: router, abi: YAK_ROUTER_ABI, functionName: "MIN_FEE" }) as Promise<bigint>,
    client.readContract({ address: router, abi: YAK_ROUTER_ABI, functionName: "WNATIVE" }) as Promise<Address>,
  ]);

  const cfgWN = PUBLIC_CONFIG.WRAPPED_NATIVE.toLowerCase();
  if (cfgWN !== routerWnative.toLowerCase()) {
    throw new Error(
      `WRAPPED_NATIVE mismatch: config=${PUBLIC_CONFIG.WRAPPED_NATIVE} router.WNATIVE=${routerWnative}. ` +
      `Fix PUBLIC_CONFIG.WRAPPED_NATIVE to match the router deployment.`
    );
  }

  const DEFAULT_FEE_BPS = 2n;
  const FEE_BPS =
    params.feeBps ?? (minFee > DEFAULT_FEE_BPS ? minFee : DEFAULT_FEE_BPS);

  const inIsNative  = isNative(params.tokenIn as string);
  const outIsNative = isNative(params.tokenOut as string);
  if (inIsNative && outIsNative) {
    // Router has no "FromAVAX & ToAVAX" combined fn; force through WNATIVE with one side native.
    throw new Error("Native->Native split not supported directly. Wrap or unwrap on one side.");
  }

  const tokenInAddr  = toQuoteAddr(params.tokenIn as string);
  const tokenOutAddr = toQuoteAddr(params.tokenOut as string);

  // Build legs as Yak trades (single adapter)
  const tradeA = {
    amountIn:  params.legs[0].amountInWei,
    amountOut: params.legs[0].minAmountOutWei,
    path:      [tokenInAddr, tokenOutAddr] as Address[],
    adapters:  [params.legs[0].adapter] as Address[],
  };
  const tradeB = {
    amountIn:  params.legs[1].amountInWei,
    amountOut: params.legs[1].minAmountOutWei,
    path:      [tokenInAddr, tokenOutAddr] as Address[],
    adapters:  [params.legs[1].adapter] as Address[],
  };

  // Validate WNATIVE endpoints for native in/out
  if (inIsNative) {
    if (tradeA.path[0].toLowerCase() !== routerWnative.toLowerCase()) {
      throw new Error("Route invalid for native input: path[0] must equal router.WNATIVE.");
    }
  }
  if (outIsNative) {
    const last = tradeA.path[tradeA.path.length - 1];
    if (last.toLowerCase() !== routerWnative.toLowerCase()) {
      throw new Error("Route invalid for native output: last path hop must equal router.WNATIVE.");
    }
  }

  // Approvals if ERC20 input
  if (!inIsNative) {
    const totalIn = tradeA.amountIn + tradeB.amountIn;
    await ensureAllowance(client, tokenInAddr, address, router, totalIn);
  }

  // Choose function names & per-call values
  let fnName:
    | "swapNoSplit"
    | "swapNoSplitFromAVAX"
    | "swapNoSplitToAVAX" = "swapNoSplit";

  if (inIsNative && !outIsNative) fnName = "swapNoSplitFromAVAX";
  else if (!inIsNative && outIsNative) fnName = "swapNoSplitToAVAX";
  else fnName = "swapNoSplit";

  // Preflight simulate each leg (catch revert reasons early)
  const simulateLeg = async (trade: typeof tradeA, value?: bigint) => {
    try {
      await client.simulateContract({
        account: address,
        address: router,
        abi: YAK_ROUTER_ABI,
        functionName: fnName,
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
  };

  const valA = inIsNative ? tradeA.amountIn : 0n;
  const valB = inIsNative ? tradeB.amountIn : 0n;

  await Promise.all([simulateLeg(tradeA, valA), simulateLeg(tradeB, valB)]);

  // Encode leg calls
  const callA = encodeFunctionData({
    abi: YAK_ROUTER_ABI,
    functionName: fnName,
    args: [tradeA, address, FEE_BPS],
  });
  const callB = encodeFunctionData({
    abi: YAK_ROUTER_ABI,
    functionName: fnName,
    args: [tradeB, address, FEE_BPS],
  });

  // Total value (for native input)
  const totalValue = inIsNative ? (tradeA.amountIn + tradeB.amountIn) : 0n;

  // Multicall3 aggregate3 (atomic)
  const txHash: Hash = await writeContract(config, {
    account: address,
    address: multicallAddr,
    abi: MULTICALL3_ABI,
    functionName: "aggregate3",
    args: [[
      { target: router, allowFailure: false, callData: callA, value: valA },
      { target: router, allowFailure: false, callData: callB, value: valB },
    ]],
    value: totalValue,
  });

  const receipt = await waitForTransactionReceipt(config, { hash: txHash });
  return receipt;
}
