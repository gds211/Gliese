// src/hooks/useYakSplitQuote.ts
import { useEffect, useMemo, useRef, useState } from "react";
import type { Address } from "viem";
import { parseUnits } from "viem";
import { usePublicClient } from "wagmi";
import { YAK_ROUTER_ABI } from "@/abi/yakRouter";
import { PUBLIC_CONFIG } from "@/config/public";
import { useNetworkFees } from "@/hooks/useNetworkFees";
import { getDecimals } from "@/lib/decimals";

// --- Types mirrored from your UI ---
export type YakFormattedOffer = {
  amounts: bigint[];
  adapters: Address[];
  path: Address[];
  gasEstimate: bigint;
};

export type YakTrade = {
  amountIn: bigint;
  amountOut: bigint;    // per-leg minOut
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
  totalAmountOut: bigint; // sum of per-leg minOut (fee + slippage adjusted)
  assumedGas: bigint;
};

const ZERO: Address = "0x0000000000000000000000000000000000000000";
const asAddress = (v: string) => v as Address;
const isNative = (v?: string) =>
  !v || v.toUpperCase() === PUBLIC_CONFIG.NATIVE_SYMBOL || v === ZERO;

// Clamp fee on the client to avoid per-leg minOut mismatch with router fee
async function getEffectiveFeeBps(client: ReturnType<typeof usePublicClient> | null, router: Address): Promise<number> {
  try {
    const minFee = (await client?.readContract({
      address: router,
      abi: YAK_ROUTER_ABI,
      functionName: "MIN_FEE",
      args: [],
    })) as bigint | undefined;
    const cfg = BigInt((PUBLIC_CONFIG as any).QUOTE?.FEE_BPS ?? 0);
    const eff = (minFee ?? 0n) > cfg ? (minFee ?? 0n) : cfg;
    const n = Number(eff);
    // Safety: fee must be <= 10000
    return n > 10000 ? 10000 : n;
  } catch {
    const cfg = (PUBLIC_CONFIG as any).QUOTE?.FEE_BPS ?? 0;
    return Math.min(10000, Number(cfg));
  }
}

function toMinOutWithFeeAndSlippage(rawOut: bigint, feeBps: number, slippageBps: number): bigint {
  const FEE_DEN = 10_000n;
  const feeAdj  = (rawOut * (FEE_DEN - BigInt(feeBps))) / FEE_DEN;
  const slipAdj = (feeAdj * (FEE_DEN - BigInt(slippageBps))) / FEE_DEN;
  return slipAdj;
}

function toTrade(offer: YakFormattedOffer, amountIn: bigint, effectiveFeeBps: number, slippageBps: number): YakTrade {
  const rawOut = offer.amounts[offer.amounts.length - 1];
  const minOut = toMinOutWithFeeAndSlippage(rawOut, effectiveFeeBps, slippageBps);
  return { amountIn, amountOut: minOut, path: offer.path, adapters: offer.adapters };
}

async function quoteOne(
  client: ReturnType<typeof usePublicClient>,
  router: Address,
  amountIn: bigint,
  tokenIn: Address,
  tokenOut: Address,
  gasPriceWei: bigint,
  maxSteps: number
): Promise<YakFormattedOffer> {
  const offer = await client.readContract({
    address: router,
    abi: YAK_ROUTER_ABI,
    functionName: "findBestPathWithGas",
    args: [amountIn, tokenIn, tokenOut, BigInt(maxSteps), gasPriceWei],
  }) as YakFormattedOffer;
  return offer;
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
    slippageBps = Number((PUBLIC_CONFIG as any).SLIPPAGE_BPS ?? 100), // default 1%
    enabled = true,
    pollingMs = Number((PUBLIC_CONFIG as any).QUOTE_POLL_MS ?? 1000),
  } = params;

  const client = usePublicClient();
  const fees = useNetworkFees(); // exposes .effectiveGasPriceWei
  const [plan, setPlan] = useState<SplitPlan | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const router = PUBLIC_CONFIG.YAK_ROUTER as Address;
  const wnative = PUBLIC_CONFIG.WRAPPED_NATIVE as Address;

  // Resolve quote token addresses (native is represented as WNATIVE on router paths)
  const tokenInAddr = useMemo(
    () => isNative(tokenIn as string) ? wnative : asAddress(tokenIn as string),
    [tokenIn, wnative]
  );
  const tokenOutAddr = useMemo(
    () => isNative(tokenOut as string) ? wnative : asAddress(tokenOut as string),
    [tokenOut, wnative]
  );

  useEffect(() => {
    let dead = false;
    const run = async () => {
      try {
        if (!enabled || !client || !router || !tokenInAddr || !tokenOutAddr) {
          if (!dead) setPlan(null);
          return;
        }

        // Inputs
        const gasWei   = (fees?.effectiveGasPriceWei ?? (PUBLIC_CONFIG as any).GAS_PRICE_WEI_FALLBACK ?? 60_000_000_000n) as bigint;
        const maxSteps = Number((PUBLIC_CONFIG as any).MAX_STEPS ?? 4);
        const tokenInAddr = isNative(tokenIn as string) ? wnative : asAddress(tokenIn as string);

        const tokenInDecimals = await getDecimals(client!, tokenInAddr);
        const amountIn = parseUnits(amountInHuman || "0", tokenInDecimals);

        // Fetch effective fee once
        const effectiveFeeBps = await getEffectiveFeeBps(client, router);

        // Try: (1) single route, (2) 50/50 split (simple and robust heuristic)
        const legsCandidates: Array<SplitPlan> = [];

        // Single
        const offerSingle = await quoteOne(client, router, amountIn, tokenInAddr, tokenOutAddr, gasWei, maxSteps);
        const legSingle: SplitLeg = {
          portionBps: 10_000,
          amountIn,
          offer: offerSingle,
          trade: toTrade(offerSingle, amountIn, effectiveFeeBps, slippageBps),
        };
        legsCandidates.push({
          kind: "single",
          legs: [legSingle],
          totalAmountIn: amountIn,
          totalAmountOut: legSingle.trade.amountOut,
          assumedGas: offerSingle.gasEstimate ?? 0n,
        });

        // Split 50/50 (you can extend with more splits if desired)
        if (amountIn > 0n) {
          const half = amountIn / 2n;
          const [offerA, offerB] = await Promise.all([
            quoteOne(client, router, half, tokenInAddr, tokenOutAddr, gasWei, maxSteps),
            quoteOne(client, router, amountIn - half, tokenInAddr, tokenOutAddr, gasWei, maxSteps),
          ]);
          const legA: SplitLeg = {
            portionBps: 5000,
            amountIn: half,
            offer: offerA,
            trade: toTrade(offerA, half, effectiveFeeBps, slippageBps),
          };
          const legB: SplitLeg = {
            portionBps: 5000,
            amountIn: amountIn - half,
            offer: offerB,
            trade: toTrade(offerB, amountIn - half, effectiveFeeBps, slippageBps),
          };
          legsCandidates.push({
            kind: "split2",
            legs: [legA, legB],
            totalAmountIn: amountIn,
            totalAmountOut: legA.trade.amountOut + legB.trade.amountOut,
            assumedGas: (offerA.gasEstimate ?? 0n) + (offerB.gasEstimate ?? 0n),
          });
        }

        // Pick the best by minOut sum (already fee+slippage adjusted)
        let best = legsCandidates[0];
        for (const cand of legsCandidates) {
          if (cand.totalAmountOut > best.totalAmountOut) best = cand;
        }

        if (!dead) setPlan(best);
      } catch (e) {
        console.error("useYakSplitQuote error", e);
        if (!dead) setPlan(null);
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
