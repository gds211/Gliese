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
import { useBlockNumber } from "@/providers/BlockNumberProvider";



// local helpers (keep types shallow)
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

export function useYakQuote({ router, tokenIn, tokenOut, amountInHuman, enabled = true, slippageBpsOverride  }: Params) {
  const client = usePublicClient();
  const { effectiveGasPriceWei } = useNetworkFees(PUBLIC_CONFIG.FEE_REFRESH_MS);
  const FALLBACK = PUBLIC_CONFIG.GAS_PRICE_WEI_FALLBACK;
  const gasRef = useRef<bigint>(effectiveGasPriceWei ?? FALLBACK);
  // === Decimals cache ===
// Stores either a resolved value or an in-flight promise to dedupe concurrent loads.
type DecCacheEntry = { value?: number; promise?: Promise<number> };
const decCacheRef = useRef<Map<string, DecCacheEntry>>(new Map());

// Include chainId in the key so switching networks never mixes decimals.
const chainId = (client as any)?.chain?.id ?? PUBLIC_CONFIG.CHAIN_ID ?? 0;
const cacheKey = (addr: Address, native: boolean) =>
  `${chainId}:${native ? ZERO : (addr as string).toLowerCase()}`;

async function getDecimalsCached(addr: Address, native: boolean): Promise<number> {
  const key = cacheKey(addr, native);
  const cache = decCacheRef.current;
  const hit = cache.get(key);

  // Fast paths
  if (hit?.value !== undefined) return hit.value;
  if (hit?.promise) return hit.promise!;

  // Load once, dedupe others
  const promise = getDecimals(client as any, native ? ZERO : addr)
    .then((dec: number) => {
      cache.set(key, { value: dec });
      return dec;
    })
    .catch((err) => {
      // On failure, clear so a later attempt can retry
      cache.delete(key);
      throw err;
    });

  cache.set(key, { promise });
  return promise;
}

 useEffect(() => {
    gasRef.current = effectiveGasPriceWei ?? FALLBACK;
  }, [effectiveGasPriceWei]);

  const [quote, setQuote] = useState<QuoteState | null>(null);
  const lastMinOutRef = useRef<bigint | null>(null);
  const reqCounter = useRef(0);

  // Poll based on effective inputs, not the raw tokenOut prop (which can be null for native)
  const polling = enabled && !!router && !!amountInHuman && +amountInHuman > 0;

  const tokenInAddr  = toQuoteAddr(tokenIn);
  const tokenOutAddr = toQuoteAddr(tokenOut);

  // Warm the decimals cache whenever tokens or chain change
  useEffect(() => {
    (async () => {
      try {
        await Promise.all([
          getDecimalsCached(tokenInAddr,  isNative(tokenIn)),
          getDecimalsCached(tokenOutAddr, isNative(tokenOut)),
        ]);
      } catch {
        // ignore; tick() will retry if needed
      }
    })();
  }, [tokenInAddr, tokenOutAddr, tokenIn, tokenOut, chainId]);

  useEffect(() => {
      // Only clear when the hook is actually disabled or amount is non-positive.
  // During token flips/decimals warmup we keep last good quote to avoid 0.00 flashes.
  if (!polling) {
    if (!enabled || !(+amountInHuman > 0)) {
      setQuote(null);
      lastMinOutRef.current = null;
    }
    return;
  }

    let cancelled = false;

    async function load() {
      const myReq = ++reqCounter.current;

      try {
        const [inDec, outDec] = await Promise.all([
           getDecimalsCached(tokenInAddr, isNative(tokenIn)),
           getDecimalsCached(tokenOutAddr, isNative(tokenOut)),
        ]);
        
        const amountIn = parseUnits(amountInHuman, inDec);
        if (amountIn === 0n) {
          if (myReq === reqCounter.current && !cancelled) {
            setQuote(null);
            lastMinOutRef.current = null;
          }
          return;
        }

        const gasWei = gasRef.current;

        // ⚠️ Returns a single tuple struct
        const formatted = await (client as any).readContract({
          address: router,
          abi: YAK_ROUTER_ABI,
          functionName: "findBestPathWithGas",
          args: [ amountIn, tokenInAddr, tokenOutAddr, BigInt(PUBLIC_CONFIG.MAX_STEPS), gasWei ],
        });

        // robust destructure (works whether viem returns object or array)
        const amounts: bigint[]   = formatted?.amounts   ?? formatted?.[0] ?? [];
        const adapters: Address[] = formatted?.adapters  ?? formatted?.[1] ?? [];
        const path: Address[]     = formatted?.path      ?? formatted?.[2] ?? [];
        const gasEstimate: bigint = formatted?.gasEstimate ?? formatted?.[3] ?? 0n;

        const outRaw = amounts.length ? amounts[amounts.length - 1] : 0n;
        const SLIP = (slippageBpsOverride ?? PUBLIC_CONFIG.SLIPPAGE_BPS);
        const minOutRaw = (outRaw * (10_000n - SLIP)) / 10_000n;

        if (!changedByAtLeastBps(lastMinOutRef.current, minOutRaw, PUBLIC_CONFIG.UPDATE_THRESHOLD_BPS)) {
          // skip UI update
        } else {
          const outFormatted     = formatUnits(outRaw, outDec);
          const minOutFormatted  = formatUnits(minOutRaw, outDec);

          if (myReq === reqCounter.current && !cancelled) {
            setQuote({ outRaw, minOutRaw, outFormatted, minOutFormatted, path, adapters, gasUsed: gasEstimate });
            lastMinOutRef.current = minOutRaw;
          }
        }
      } catch {
        if (myReq === reqCounter.current && !cancelled) {
          if (!quote) setQuote(null);
        }
      } finally {
        // no userland timer scheduling; updates come from new blocks
      }
    }

    // initial fetch
    load();

    const { blockNumber } = useBlockNumber();

useEffect(() => {
  if (!polling || !enabled) return;
  if (!router || !tokenInAddr || !tokenOutAddr) return;

  let cancelled = false;

  (async () => {
    try {
      await load();     // your existing loader function in this hook
    } catch {}
  })();

  return () => { cancelled = true; };
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [blockNumber, polling, enabled, router, tokenInAddr, tokenOutAddr, amountInHuman]);

  return quote;
}


