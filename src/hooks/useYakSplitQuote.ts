// src/hooks/useYakSplitQuote.ts
import { useEffect, useMemo, useRef, useState } from "react";
import type { Address } from "viem";
import { parseUnits } from "viem";
import { usePublicClient } from "wagmi";
import { YAK_ROUTER_ABI } from "@/abi/yakRouter";
import { PUBLIC_CONFIG } from "@/config/public";
import { useNetworkFees } from "@/hooks/useNetworkFees";

export type YakFormattedOffer = {
  amounts: bigint[];
  adapters: Address[];
  path: Address[];
  gasEstimate: bigint;
};

export type YakTrade = {
  amountIn: bigint;
  amountOut: bigint;    // minOut for slippage guard
  path: Address[];
  adapters: Address[];
};

export type SplitLeg = {
  portionBps: number;   // 0..10000
  amountIn: bigint;
  offer: YakFormattedOffer;
  trade: YakTrade;
};

export type SplitPlan = {
  kind: "single" | "split2";
  legs: SplitLeg[];
  totalAmountIn: bigint;
  totalAmountOut: bigint; // sum of minOuts (pre-slippage or already applied)
  assumedGas: bigint;     // raw gasEstimate sum (informational)
};

const asAddress = (v: string) => v as Address;
const toBps = (pct: number) => Math.round(pct * 100);

function toTrade(offer: YakFormattedOffer, amountIn: bigint, slippageBps: number): YakTrade {
  const rawOut = offer.amounts[offer.amounts.length - 1];
  const minOut = rawOut - (rawOut * BigInt(slippageBps)) / 10_000n;
  return { amountIn, amountOut: minOut, path: offer.path, adapters: offer.adapters };
}

export function useYakSplitQuote(params: {
  tokenIn?: Address | string;         // symbol or address (symbol treated as native if equals PUBLIC_CONFIG.NATIVE_SYMBOL)
  tokenOut?: Address | string;
  amountInHuman?: string;             // decimal string in tokenIn units
  slippageBps?: number;               // per-leg slippage guard
  enabled?: boolean;
  pollingMs?: number;
}) {
  const {
    tokenIn,
    tokenOut,
    amountInHuman = "0",
    slippageBps = PUBLIC_CONFIG.QUOTE?.SLIPPAGE_BPS ?? 100, // 1%
    enabled = true,
    pollingMs = PUBLIC_CONFIG.QUOTE_POLL_MS ?? 5000,
  } = params;

  const client = usePublicClient();
  const fees = useNetworkFees(); // exposes .effectiveGasPriceWei
  const [plan, setPlan] = useState<SplitPlan | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const router = PUBLIC_CONFIG?.YAK_ROUTER as Address;
  const wnative = PUBLIC_CONFIG?.WRAPPED_NATIVE as Address;
  const isNative = (v?: string) => !v || v.toUpperCase() === PUBLIC_CONFIG.NATIVE_SYMBOL || v === "0x0000000000000000000000000000000000000000";

  // Resolve quote addresses
  const tokenInAddr = useMemo(() => isNative(tokenIn as string) ? wnative : asAddress(tokenIn as string), [tokenIn, wnative]);
  const tokenOutAddr = useMemo(() => isNative(tokenOut as string) ? wnative : asAddress(tokenOut as string), [tokenOut, wnative]);

  useEffect(() => {
    if (!enabled || !client || !router || !tokenInAddr || !tokenOutAddr) return;

    let dead = false;
    const run = async () => {
      try {
        const maxSteps = PUBLIC_CONFIG.QUOTE?.MAX_STEPS ?? 3;
        const gasPrice = fees?.effectiveGasPriceWei ?? 0n;
        const decimalsIn = BigInt(PUBLIC_CONFIG.NATIVE_DECIMALS); // or fetch via ERC20 if desired
        const amountIn = parseUnits(amountInHuman || "0", Number(decimalsIn));
        if (amountIn === 0n) { setPlan(null); return; }

        const splitsBps = [
          [10000, 0], // no split (we’ll treat as single)
          [5000, 5000],
          [7000, 3000],
          [3000, 7000],
        ];

        // helper to quote a portion
        const quotePortion = async (portion: bigint) => {
          const offer = await client.readContract({
            address: router,
            abi: YAK_ROUTER_ABI,
            functionName: "findBestPathWithGas",
            args: [portion, tokenInAddr, tokenOutAddr, BigInt(maxSteps), gasPrice],
          }) as YakFormattedOffer;

          return offer;
        };

        // Evaluate candidates
        let best: SplitPlan | null = null;

        for (const [bpsA, bpsB] of splitsBps) {
          const aIn = (amountIn * BigInt(bpsA)) / 10_000n;
          const bIn = amountIn - aIn;

          const offerA = await quotePortion(aIn);
          const tradeA = toTrade(offerA, aIn, slippageBps);

          let legs: SplitLeg[] = [{
            portionBps: bpsA,
            amountIn: aIn,
            offer: offerA,
            trade: tradeA,
          }];

          if (bpsB > 0) {
            const offerB = await quotePortion(bIn);
            const tradeB = toTrade(offerB, bIn, slippageBps);
            legs.push({
              portionBps: bpsB,
              amountIn: bIn,
              offer: offerB,
              trade: tradeB,
            });
          }

          const totalOut = legs.reduce((acc, l) => acc + l.trade.amountOut, 0n);
          const gasSum   = legs.reduce((acc, l) => acc + (l.offer.gasEstimate ?? 0n), 0n);

          const candidate: SplitPlan = {
            kind: bpsB === 0 ? "single" : "split2",
            legs,
            totalAmountIn: amountIn,
            totalAmountOut: totalOut,
            assumedGas: gasSum,
          };

          if (!best || candidate.totalAmountOut > best.totalAmountOut) best = candidate;
        }

        if (!dead) setPlan(best);
      } catch (e) {
        if (!dead) setPlan(null);
        console.error("useYakSplitQuote error", e);
      } finally {
        if (!dead) {
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(run, pollingMs);
        }
      }
    };

    run();
    return () => { dead = true; if (timerRef.current) clearTimeout(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, client, router, tokenInAddr, tokenOutAddr, amountInHuman, fees?.effectiveGasPriceWei]);

  return plan;
}

