// src/lib/splitQuote.ts
import type { Address, Hex } from "viem";
import { encodeFunctionData, parseUnits } from "viem";
import { PUBLIC_CONFIG } from "@/config/public";
import { YAK_ROUTER_ABI } from "@/abi/yakRouter";
import { getDecimals } from "@/lib/decimals";

export type LegQuote = {
  amountIn: bigint;
  outRaw: bigint;
  minOutRaw: bigint;
  path: Address[];
  adapters: Address[];
  gasEstimate: bigint;
  target: Address;
  callData: Hex;
};

export type SplitPlan = {
  wrapper: Address;
  tokenIn: Address;
  tokenOut: Address;
  totalIn: bigint;
  minTotalOut: bigint;
  legs: LegQuote[];
  totalOut: bigint;
  deadline: bigint;
};

type QuoteFnCtx = {
  client: any;
  router: Address;
  inAddr: Address;
  outAddr: Address;
  inDec: number;
  outDec: number;
  gasWei: bigint;
  maxSteps: number;
  slippageBps: bigint;
};

async function quoteSingleAmount(ctx: QuoteFnCtx, amountIn: bigint) {
  const formatted = await (ctx.client as any).readContract({
    address: ctx.router,
    abi: YAK_ROUTER_ABI,
    functionName: "findBestPathWithGas",
    args: [amountIn, ctx.inAddr, ctx.outAddr, BigInt(ctx.maxSteps), ctx.gasWei],
  });

  const amounts: bigint[]   = formatted?.amounts    ?? formatted?.[0] ?? [];
  const adapters: Address[] = formatted?.adapters   ?? formatted?.[1] ?? [];
  const path: Address[]     = formatted?.path       ?? formatted?.[2] ?? [];
  const gasEstimate: bigint = formatted?.gasEstimate?? formatted?.[3] ?? 0n;

  const outRaw = amounts.length ? amounts[amounts.length - 1] : 0n;
  const minOutRaw = (outRaw * (10_000n - ctx.slippageBps)) / 10_000n;

  return { outRaw, minOutRaw, adapters, path, gasEstimate };
}

function routeId(adapters: Address[], path: Address[]) {
  return [...adapters, ...path].map(a => a.toLowerCase()).join("|");
}

export async function computeBestSplitPlan(args: {
  client: any;
  router: Address;
  wrapper: Address;
  tokenIn: string;   // must be ERC20 (no native)
  tokenOut: string;  // must be ERC20 (no native)
  amountInHuman: string;
  gasWei: bigint;
  slippageBps: bigint;
  maxSteps?: number;
}): Promise<{ best: SplitPlan | null; baselineOut: bigint; baselineMinOut: bigint }> {
  const { client, router, wrapper, tokenIn, tokenOut, amountInHuman, gasWei, slippageBps, maxSteps = PUBLIC_CONFIG.MAX_STEPS } = args;

  const ZERO = "0x0000000000000000000000000000000000000000";
  const isNative = (v?: string) => !v || v.toUpperCase() === PUBLIC_CONFIG.NATIVE_SYMBOL || v === ZERO;
  if (isNative(tokenIn) || isNative(tokenOut)) return { best: null, baselineOut: 0n, baselineMinOut: 0n };

  const inAddr  = tokenIn  as Address;
  const outAddr = tokenOut as Address;
  const inDec   = await getDecimals(client as any, inAddr);
  const outDec  = await getDecimals(client as any, outAddr);
  const totalIn = parseUnits(amountInHuman || "0", inDec);
  if (totalIn === 0n) return { best: null, baselineOut: 0n, baselineMinOut: 0n };

  const ctx: QuoteFnCtx = { client, router, inAddr, outAddr, inDec, outDec, gasWei, maxSteps, slippageBps };

  // Baseline
  const base = await quoteSingleAmount(ctx, totalIn);
  const baselineOut    = base.outRaw;
  const baselineMinOut = base.minOutRaw;

  const FRA       = PUBLIC_CONFIG.YAK_SPLIT.FRACTIONS as number[];    // e.g. [80,70,60,50]
  const MIN_GAIN  = BigInt(PUBLIC_CONFIG.YAK_SPLIT.MIN_GAIN_BPS);     // e.g. 20
  const WRAP_GAS  = BigInt(PUBLIC_CONFIG.YAK_SPLIT.WRAPPER_GAS_OVERHEAD || 0);

  let best: SplitPlan | null = null;
  let bestOut = baselineOut;

  for (const pct of FRA) {
    if (pct <= 0 || pct >= 100) continue;

    const aIn = (totalIn * BigInt(pct)) / 100n;
    const bIn = totalIn - aIn;

    const qa = await quoteSingleAmount(ctx, aIn);
    const qb = await quoteSingleAmount(ctx, bIn);

    // If both legs pick the exact same route, splitting provides no AMM advantage; skip
    if (routeId(qa.adapters, qa.path) === routeId(qb.adapters, qb.path)) continue;

    const totalOut     = qa.outRaw + qb.outRaw;
    const minTotalOut  = qa.minOutRaw + qb.minOutRaw;
    const totalGas     = qa.gasEstimate + qb.gasEstimate + WRAP_GAS; // noted for visibility; not subtracting in this v1

    if (totalOut > bestOut) {
      const tradeA = { amountIn: aIn, amountOut: qa.minOutRaw, path: qa.path as Address[], adapters: qa.adapters as Address[] };
      const tradeB = { amountIn: bIn, amountOut: qb.minOutRaw, path: qb.path as Address[], adapters: qb.adapters as Address[] };

      const cdA = encodeFunctionData({ abi: YAK_ROUTER_ABI as any, functionName: "swapNoSplit", args: [tradeA, wrapper, 0n] }) as Hex;
      const cdB = encodeFunctionData({ abi: YAK_ROUTER_ABI as any, functionName: "swapNoSplit", args: [tradeB, wrapper, 0n] }) as Hex;

      best = {
        wrapper,
        tokenIn: inAddr,
        tokenOut: outAddr,
        totalIn,
        minTotalOut,
        legs: [
          { amountIn: aIn, outRaw: qa.outRaw, minOutRaw: qa.minOutRaw, path: qa.path as Address[], adapters: qa.adapters as Address[], gasEstimate: qa.gasEstimate, target: router, callData: cdA },
          { amountIn: bIn, outRaw: qb.outRaw, minOutRaw: qb.minOutRaw, path: qb.path as Address[], adapters: qb.adapters as Address[], gasEstimate: qb.gasEstimate, target: router, callData: cdB },
        ],
        totalOut,
        deadline: BigInt(Math.floor(Date.now() / 1000) + (PUBLIC_CONFIG.YAK_SPLIT.DEADLINE_SECONDS || 120)),
      };
      bestOut = totalOut;
    }
  }

  // Only accept if materially better than baseline (covers wrapper overhead & unknown gas conversion)
  if (best && (best.totalOut * 10_000n) / (baselineOut || 1n) >= (10_000n + MIN_GAIN)) {
    return { best, baselineOut, baselineMinOut };
  }
  return { best: null, baselineOut, baselineMinOut };
}
