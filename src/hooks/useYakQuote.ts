// src/hooks/useYakQuote.ts
import { useEffect, useRef, useState } from "react";
import type { Address } from "viem";
import { formatUnits, parseUnits } from "viem";
import { usePublicClient } from "wagmi";
import { YAK_ROUTER_ABI } from "@/abi/yakRouter";
import { PUBLIC_CONFIG } from "@/config/public";
import { getDecimals } from "@/lib/decimals";
import { changedByAtLeastBps } from "@/lib/math";
import { useNetworkFees } from "@/hooks/useNetworkFees";
import { computeBestSplitPlan } from "@/lib/splitQuote";

// local helpers
const ZERO = "0x0000000000000000000000000000000000000000";
const isNative = (v?: string) =>
  !v || v.toUpperCase() === PUBLIC_CONFIG.NATIVE_SYMBOL || v === ZERO;
const toQuoteAddr = (v?: string) =>
  (isNative(v) ? (PUBLIC_CONFIG.WRAPPED_NATIVE as Address) : (v as Address));

export type QuoteState = {
  outRaw: bigint;
  minOutRaw: bigint;
  outFormatted: string;
  minOutFormatted: string;
  path: Address[];
  adapters: Address[];
  gasUsed: bigint;
  // NEW: carries the split plan if chosen; undefined otherwise
  splitPlan?: SplitPlan | null;
};

type Params = {
  router: Address;
  tokenIn?: string;
  tokenOut?: string;
  amountInHuman: string;
  enabled?: boolean;
  /** Optional override for slippage (in bps). If omitted, falls back to PUBLIC_CONFIG.SLIPPAGE_BPS. */
  slippageBpsOverride?: bigint;
};

export function useYakQuote({ router, tokenIn, tokenOut, amountInHuman, enabled = true, slippageBpsOverride  }: Params) {
  const client = usePublicClient();
  const { effectiveGasPriceWei } = useNetworkFees(PUBLIC_CONFIG.FEE_REFRESH_MS);
  const FALLBACK = PUBLIC_CONFIG.GAS_PRICE_WEI_FALLBACK;
  const gasRef = useRef<bigint>(effectiveGasPriceWei ?? FALLBACK);

  // decimals cache
  type DecCacheEntry = { value?: number; promise?: Promise<number> };
  const decCacheRef = useRef<Map<string, DecCacheEntry>>(new Map());
  const chainId = (client as any)?.chain?.id ?? PUBLIC_CONFIG.CHAIN_ID ?? 0;
  const cacheKey = (addr: Address, native: boolean) =>
    `${chainId}:${native ? ZERO : (addr as string).toLowerCase()}`;

  async function getDecimalsCached(addr: Address, native: boolean): Promise<number> {
    const key = cacheKey(addr, native);
    const cache = decCacheRef.current;
    const hit = cache.get(key);
    if (hit?.value !== undefined) return hit.value;
    if (hit?.promise) return hit.promise!;

    const promise = getDecimals(client as any, native ? ZERO : addr)
      .then((dec: number) => {
        cache.set(key, { value: dec });
        return dec;
      })
      .catch((err) => {
        cache.delete(key);
        throw err;
      });

    cache.set(key, { promise });
    return promise;
  }

  const [quote, setQuote] = useState<QuoteState | null>(null);
  const [polling, setPolling] = useState<boolean>(false);
  const reqCounter = useRef<number>(0);
  const lastMinOutRef = useRef<bigint>(0n);

  useEffect(() => { gasRef.current = effectiveGasPriceWei ?? FALLBACK; }, [effectiveGasPriceWei]);

  useEffect(() => {
    let cancelled = false;
    let timer: any;
    setPolling(Boolean(enabled));

    async function tick() {
      if (cancelled || !enabled) return;
      const myReq = ++reqCounter.current;

      try {
        const tokenInAddr  = toQuoteAddr(tokenIn);
        const tokenOutAddr = toQuoteAddr(tokenOut);
        const inIsNative  = isNative(tokenIn);
        const outIsNative = isNative(tokenOut);

        if (!tokenIn || !tokenOut) {
          setQuote(null);
          return;
        }

        const inDec  = await getDecimalsCached(tokenInAddr,  inIsNative);
        const outDec = await getDecimalsCached(tokenOutAddr, outIsNative);
        const amountIn = parseUnits(amountInHuman || "0", inDec);
        if (amountIn === 0n) {
          setQuote(null);
          return;
        }

        const gasWei = gasRef.current;

        // Baseline single-route quote
        const formatted = await (client as any).readContract({
          address: router,
          abi: YAK_ROUTER_ABI,
          functionName: "findBestPathWithGas",
          args: [ amountIn, tokenInAddr, tokenOutAddr, BigInt(PUBLIC_CONFIG.MAX_STEPS), gasWei ],
        });

        const amounts: bigint[]   = formatted?.amounts   ?? formatted?.[0] ?? [];
        const adapters: Address[] = formatted?.adapters  ?? formatted?.[1] ?? [];
        const path: Address[]     = formatted?.path      ?? formatted?.[2] ?? [];
        const gasEstimate: bigint = formatted?.gasEstimate ?? formatted?.[3] ?? 0n;

        const outRaw = amounts.length ? amounts[amounts.length - 1] : 0n;
        const SLIP = (slippageBpsOverride ?? PUBLIC_CONFIG.SLIPPAGE_BPS);
        const minOutRaw = (outRaw * (10_000n - SLIP)) / 10_000n;

        // Try split (ERC20-only) if enabled
        let splitPlan: SplitPlan | null = null;
        if (PUBLIC_CONFIG.YAK_SPLIT?.ENABLED && !inIsNative && !outIsNative) {
          const res = await computeBestSplitPlan({
            client,
            router,
            wrapper: PUBLIC_CONFIG.YAK_SPLIT.WRAPPER_ADDRESS as Address,
            tokenIn: tokenIn as string,
            tokenOut: tokenOut as string,
            amountInHuman,
            gasWei,
            slippageBps: SLIP,
            maxSteps: PUBLIC_CONFIG.MAX_STEPS,
          });
          splitPlan = res.best;
        }

        // choose final
        let finalOut = outRaw;
        let finalMin = minOutRaw;
        let finalPath = path;
        let finalAdapters = adapters;
        let finalGas = gasEstimate;
        let finalSplit: SplitPlan | null | undefined = undefined;

        if (splitPlan && splitPlan.totalOut > outRaw) {
          finalOut = splitPlan.totalOut;
          finalMin = splitPlan.minTotalOut;
          finalPath = [];
          finalAdapters = [];
          finalGas = splitPlan.legs.reduce((acc, l) => acc + l.gasEstimate, 0n);
          finalSplit = splitPlan;
        }

        if (!changedByAtLeastBps(lastMinOutRef.current, finalMin, PUBLIC_CONFIG.UPDATE_THRESHOLD_BPS)) {
          // no state update (hysteresis)
        } else {
          const outFormatted    = formatUnits(finalOut, outDec);
          const minOutFormatted = formatUnits(finalMin, outDec);
          if (myReq === reqCounter.current && !cancelled) {
            setQuote({
              outRaw: finalOut,
              minOutRaw: finalMin,
              outFormatted,
              minOutFormatted,
              path: finalPath,
              adapters: finalAdapters,
              gasUsed: finalGas,
              splitPlan: finalSplit,
            });
            lastMinOutRef.current = finalMin;
          }
        }
      } catch {
        // keep previous quote for UI stability
      } finally {
        if (!cancelled) timer = setTimeout(tick, PUBLIC_CONFIG.QUOTE_POLL_MS);
      }
    }

    tick();
    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polling, router, tokenIn, tokenOut, amountInHuman]);

  return quote;
}
