// src/hooks/useYakSplitQuote.ts
import { useEffect, useRef, useState } from "react";
import type { Address } from "viem";
import { formatUnits, parseUnits } from "viem";
import { usePublicClient } from "wagmi";
import { YAK_ROUTER_ABI } from "@/abi/yakRouter";
import { PUBLIC_CONFIG } from "@/config/public";
import { getDecimals } from "@/lib/decimals";
import { changedByAtLeastBps } from "@/lib/math";

type Route = { amountIn: bigint; path: Address[]; adapters: Address[]; amountOut: bigint; gasUsed: bigint };
export type SplitPlan = {
  bestIsSplit: boolean;
  // merged numbers
  totalOutRaw: bigint;
  minTotalOutRaw: bigint;
  // legs if split
  routes?: [Route, Route];
};

export function useYakSplitQuote(params: {
  polling: boolean;
  amountInHuman: string;
  tokenIn: string;  // symbol or "MON" for native
  tokenOut: string;
  maxSteps?: number;
  slippageBps?: bigint;
  gasPriceWei?: bigint; // optional override
}) {
  const {
    polling,
    amountInHuman,
    tokenIn,
    tokenOut,
    maxSteps = PUBLIC_CONFIG.MAX_STEPS,
    slippageBps = PUBLIC_CONFIG.SLIPPAGE_BPS,
  } = params;

  const [plan, setPlan] = useState<SplitPlan | null>(null);
  const pc = usePublicClient();
  const router = PUBLIC_CONFIG.YAK_ROUTER as Address;

  useEffect(() => {
    if (!polling) { setPlan(null); return; }

    let cancelled = false;
    let timer: any;

    const tick = async () => {
      try {
        const inAddr  = PUBLIC_CONFIG.ADDRESSES[tokenIn] ?? "0x0000000000000000000000000000000000000000";
        const outAddr = PUBLIC_CONFIG.ADDRESSES[tokenOut] ?? "0x0000000000000000000000000000000000000000";
        const [inDec, outDec] = await Promise.all([getDecimals(inAddr), getDecimals(outAddr)]);

        const amountIn = parseUnits(amountInHuman || "0", inDec);
        if (amountIn === 0n || tokenIn === tokenOut) { setPlan(null); return; }

        const callBest = (amt: bigint) =>
          pc.readContract({
            address: router,
            abi: YAK_ROUTER_ABI,
            functionName: "findBestPathWithGas",
            args: [amt, inAddr as Address, outAddr as Address, BigInt(maxSteps), 0n],
          }) as Promise<[bigint[], Address[], Address[], bigint]>;

        // base, no-split
        const [amounts0, path0, adapters0, gas0] = await callBest(amountIn);
        const out0 = amounts0.length ? amounts0[amounts0.length - 1] : 0n;

        // try 2-way splits: 20/80, 30/70, 40/60, 50/50
        const candidates = [20n, 30n, 40n, 50n];
        let best = { totalOut: out0, gas: gas0, routes: null as any };

        for (const pct of candidates) {
          const a = (amountIn * pct) / 100n;
          const b = amountIn - a;
          if (a === 0n || b === 0n) continue;

          const [[aAmts, aPath, aAd, aGas], [bAmts, bPath, bAd, bGas]] = await Promise.all([
            callBest(a),
            callBest(b),
          ]);

          const aOut = aAmts.length ? aAmts[aAmts.length - 1] : 0n;
          const bOut = bAmts.length ? bAmts[bAmts.length - 1] : 0n;
          const totalOut = aOut + bOut;
          const totalGas = aGas + bGas;

          if (totalOut > best.totalOut) {
            best = {
              totalOut,
              gas: totalGas,
              routes: [
                { amountIn: a, path: aPath as Address[], adapters: aAd as Address[], amountOut: aOut, gasUsed: aGas },
                { amountIn: b, path: bPath as Address[], adapters: bAd as Address[], amountOut: bOut, gasUsed: bGas },
              ],
            };
          }
        }

        // decide split vs no-split with a small threshold (15 bps)
        const IMPROVEMENT_BPS = 15n;
        const betterByBps = best.totalOut === 0n ? 0n : ((best.totalOut - out0) * 10_000n) / best.totalOut;
        const chooseSplit = best.routes && betterByBps >= IMPROVEMENT_BPS;

        const minTotalOutRaw = ((chooseSplit ? best.totalOut : out0) * (10_000n - slippageBps)) / 10_000n;

        if (!cancelled) {
          setPlan({
            bestIsSplit: !!chooseSplit,
            totalOutRaw: chooseSplit ? best.totalOut : out0,
            minTotalOutRaw,
            routes: chooseSplit ? best.routes as [Route, Route] : undefined,
          });
        }
      } finally {
        if (!cancelled) timer = setTimeout(tick, PUBLIC_CONFIG.QUOTE_POLL_MS);
      }
    };

    tick();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [polling, amountInHuman, tokenIn, tokenOut, maxSteps, slippageBps, pc, router]);

  return plan;
}

