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

// ---- helpers ----
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

export function useYakQuote({
  router,
  tokenIn,
  tokenOut,
  amountInHuman,
  enabled = true,
  slippageBpsOverride,
}: Params) {
  const client = usePublicClient();
  const { effectiveGasPriceWei } = useNetworkFees(PUBLIC_CONFIG.FEE_REFRESH_MS); // block-driven now
  const FALLBACK = PUBLIC_CONFIG.GAS_PRICE_WEI_FALLBACK;
  const gasRef = useRef<bigint>(effectiveGasPriceWei ?? FALLBACK);
  useEffect(() => { gasRef.current = effectiveGasPriceWei ?? FALLBACK; }, [effectiveGasPriceWei]);

  // Decimals cache (per-hook dedupe; global decimals() cache lives in lib/decimals.ts)
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
      .then((d: number) => { cache.set(key, { value: d }); return d; })
      .catch((err) => { cache.delete(key); throw err; });
    cache.set(key, { promise });
    return promise;
  }

  const [quote, setQuote] = useState<QuoteState | null>(null);
  const lastMinOutRef = useRef<bigint | null>(null);
  const reqCounter = useRef(0);

  const tokenInAddr  = toQuoteAddr(tokenIn);
  const tokenOutAddr = toQuoteAddr(tokenOut);

  // Only “armed” when quoting is meaningful
  const polling = enabled && !!router && !!amountInHuman && +amountInHuman > 0;

  // Warm decimals on token/chain changes
  useEffect(() => {
    (async () => {
      try {
        await Promise.all([
          getDecimalsCached(tokenInAddr,  isNative(tokenIn)),
          getDecimalsCached(tokenOutAddr, isNative(tokenOut)),
        ]);
      } catch { /* doFetch will retry */ }
    })();
  }, [tokenInAddr, tokenOutAddr, tokenIn, tokenOut, chainId]);

  // The fetcher
  const doFetch = async (): Promise<void> => {
    if (!client || !polling) return;
    const myReq = ++reqCounter.current;

    try {
      const [inDec, outDec] = await Promise.all([
        getDecimalsCached(tokenInAddr,  isNative(tokenIn)),
        getDecimalsCached(tokenOutAddr, isNative(tokenOut)),
      ]);

      const amountIn = parseUnits(amountInHuman, inDec);
      if (amountIn === 0n) {
        if (myReq === reqCounter.current) {
          setQuote(null);
          lastMinOutRef.current = null;
        }
        return;
      }

      const gasWei = gasRef.current;

      const formatted: any = await (client as any).readContract({
        address: router,
        abi: YAK_ROUTER_ABI,
        functionName: "findBestPathWithGas",
        args: [ amountIn, tokenInAddr, tokenOutAddr, BigInt(PUBLIC_CONFIG.MAX_STEPS), gasWei ],
      });

      // viem can return object or array tuple
      const amounts: bigint[]   = formatted?.amounts     ?? formatted?.[0] ?? [];
      const adapters: Address[] = formatted?.adapters    ?? formatted?.[1] ?? [];
      const path: Address[]     = formatted?.path        ?? formatted?.[2] ?? [];
      const gasEstimate: bigint = formatted?.gasEstimate ?? formatted?.[3] ?? 0n;

      const outRaw = amounts.length ? amounts[amounts.length - 1] : 0n;
      const SLIP = (slippageBpsOverride ?? PUBLIC_CONFIG.SLIPPAGE_BPS);
      const minOutRaw = (outRaw * (10_000n - SLIP)) / 10_000n;

      // Avoid noisy UI updates
      if (!changedByAtLeastBps(lastMinOutRef.current, minOutRaw, PUBLIC_CONFIG.UPDATE_THRESHOLD_BPS)) {
        return;
      }

      const outFormatted    = formatUnits(outRaw, outDec);
      const minOutFormatted = formatUnits(minOutRaw, outDec);

      if (myReq === reqCounter.current) {
        setQuote({ outRaw, minOutRaw, outFormatted, minOutFormatted, path, adapters, gasUsed: gasEstimate });
        lastMinOutRef.current = minOutRaw;
      }
    } catch {
      // Keep last good quote on error; natural next block or input change will refresh.
    }
  };

  // 1) Debounced immediate reaction on relevant input changes
  useEffect(() => {
    if (!polling) {
      setQuote(null);
      lastMinOutRef.current = null;
      return;
    }
    const id = setTimeout(() => { void doFetch(); }, 200);
    return () => clearTimeout(id);
  }, [polling, router, tokenInAddr, tokenOutAddr, amountInHuman]);

  // 2) Block-driven refresh (WS; HTTP fallback via pollingInterval)
  useEffect(() => {
    if (!client || !polling) return;
    const everyN =
      (PUBLIC_CONFIG as any).UNIT_QUOTE_EVERY_N_BLOCKS && amountInHuman === "1"
        ? Number((PUBLIC_CONFIG as any).UNIT_QUOTE_EVERY_N_BLOCKS)
        : 1;

    let ix = 0;
    const unwatch = (client as any).watchBlocks?.({
      onBlock: () => {
        ix++;
        if (ix % everyN === 0) void doFetch();
      },
      // If WS is not available, viem uses this interval to poll.
      pollingInterval: PUBLIC_CONFIG.QUOTE_POLL_MS,
      emitMissed: true,
    });

    return () => unwatch?.();
  }, [client, polling, router, tokenInAddr, tokenOutAddr, amountInHuman]);

  return quote;
}
