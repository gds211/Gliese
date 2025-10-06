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

import {
  computeDynamicSlippage,
  RollingRates1e18,
  makeRouteKey,
} from "@/lib/dynamicSlippage";

// ---------------- local helpers ----------------
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

  // NEW (optional, for UI/telemetry)
  slippageBps?: number;
  debugReasons?: string[];
};

type Params = {
  router: Address;
  tokenIn?: string;
  tokenOut?: string;
  amountInHuman: string;
  enabled?: boolean;
};

// ---- Dual-probe policy ----
// Adaptive base cooldown: ~ every 3 polls, but never under 6s, with tiny jitter to avoid thundering herd
const BASE_COOLDOWN_MS = Math.max(6000, (PUBLIC_CONFIG.QUOTE_POLL_MS ?? 2000) * 3);
const jitter = () => Math.floor(Math.random() * 1000);
const nextCooldown = () => BASE_COOLDOWN_MS + jitter();

const PROBE_MIN_AMOUNT_WEI = 1n;   // reduced amount must stay >=1 wei
const PROBE_AMOUNTS = [95n, 90n];  // -5%, -10%

// Amount-change threshold for triggering probes outside cooldown (in bps)
const PROBE_AMOUNT_DELTA_BPS = 50n; // 0.5%

export function useYakQuote({ router, tokenIn, tokenOut, amountInHuman, enabled = true }: Params) {
  const client = usePublicClient();
  const { effectiveGasPriceWei } = useNetworkFees(PUBLIC_CONFIG.FEE_REFRESH_MS);
  const FALLBACK = PUBLIC_CONFIG.GAS_PRICE_WEI_FALLBACK;
  const gasRef = useRef<bigint>(effectiveGasPriceWei ?? FALLBACK);

  // === Decimals cache ===
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

    if (hit?.value !== undefined) return hit.value;
    if (hit?.promise) return hit.promise!;

    const promise = getDecimals(client as any, native ? ZERO : addr)
      .then((dec: number) => {
        cache.set(key, { value: dec });
        return dec;
      })
      .catch((err) => {
        cache.delete(key);
        if (PUBLIC_CONFIG.DEBUG) console.debug("[decimals] fail", { addr, native, err });
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

  // Rolling micro-vol, route fingerprints, and probe throttling
  const ratesBufRef = useRef(new RollingRates1e18(40)); // ~80s of history @2s
  const prevRouteKeyRef = useRef<string | null>(null);
  const prevQuoteTsRef = useRef<number>(0);

  const lastProbeAtRef = useRef<number>(0);
  const lastProbeCooldownRef = useRef<number>(nextCooldown());
  const lastProbedAmountRef = useRef<bigint>(0n);
  const lastProbedRouteKeyRef = useRef<string | null>(null);

  const polling = enabled && !!router && !!tokenOut && !!amountInHuman && +amountInHuman > 0;

  const tokenInAddr  = toQuoteAddr(tokenIn);
  const tokenOutAddr = toQuoteAddr(tokenOut);

  // Warm decimals cache on token/chain changes
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenInAddr, tokenOutAddr, tokenIn, tokenOut, chainId]);

  // NEW: reset rolling/probe state on pair or chain changes
  useEffect(() => {
    ratesBufRef.current = new RollingRates1e18(40);
    prevRouteKeyRef.current = null;
    prevQuoteTsRef.current = 0;
    lastProbeAtRef.current = 0;
    lastProbeCooldownRef.current = nextCooldown();
    lastProbedAmountRef.current = 0n;
    lastProbedRouteKeyRef.current = null;
  }, [tokenInAddr, tokenOutAddr, chainId]);

  useEffect(() => {
    if (!polling) { setQuote(null); lastMinOutRef.current = null; return; }

    let timer: any;
    let cancelled = false;

    async function tick() {
      const myReq = ++reqCounter.current;
      const now = Date.now();

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

        // Convert WEI → integer GWEI (Yak expects GWEI)
        const GWEI = 1_000_000_000n;
        let gasGwei = (gasRef.current + GWEI / 2n) / GWEI;
        if (gasGwei < 1n) gasGwei = 1n; // guard

        // Clamp to Yak’s cap (<4) even if config drifts
        const steps = BigInt(Math.min(PUBLIC_CONFIG.MAX_STEPS ?? 3, 3));

        // --- Main Yak quote ---
        const formatted = await (client as any).readContract({
          address: router,
          abi: YAK_ROUTER_ABI,
          functionName: "findBestPathWithGas",
          args: [ amountIn, tokenInAddr, tokenOutAddr, steps, gasGwei ],
        });

        // Viem returns object or tuple depending on config; support both
        const amounts: bigint[]   = formatted?.amounts     ?? formatted?.[0] ?? [];
        const adapters: Address[] = formatted?.adapters    ?? formatted?.[1] ?? [];
        const path: Address[]     = formatted?.path        ?? formatted?.[2] ?? [];
        const gasEstimate: bigint = formatted?.gasEstimate ?? formatted?.[3] ?? 0n;

        const outRaw = amounts.length ? amounts[amounts.length - 1] : 0n;

        // Route fingerprint (tokens + adapters); detect path churn
        const routeKey = makeRouteKey([...(path ?? []), ...(adapters ?? [])]);
        const routeChanged = prevRouteKeyRef.current !== null && prevRouteKeyRef.current !== routeKey;

        // Rolling outPerIn (1e18 fixed-point) → micro-vol & confidence terms
        if (amountIn > 0n && outRaw > 0n) {
          const rate1e18 =
            ((outRaw * 10n ** BigInt(inDec)) * 1_000_000_000_000_000_000n) /
            (amountIn * 10n ** BigInt(outDec));
          if (rate1e18 > 0n) ratesBufRef.current.push(rate1e18);
        }

        // Use Yak's hop-summed gas units as heuristic (optional)
        const estGasUnits =
          gasEstimate > 0n && gasEstimate < 1_000_000_000n ? Number(gasEstimate) : undefined;

        // ---- Dual probes: −5% / −10% with cooldown & same-route guard ----
        let probe5: { amountInRaw: bigint; outRaw: bigint } | undefined;
        let probe10: { amountInRaw: bigint; outRaw: bigint } | undefined;

        const sinceProbe = now - (lastProbeAtRef.current || 0);
        const amountChanged =
          lastProbedAmountRef.current === 0n
            ? true
            : (amountIn > lastProbedAmountRef.current
                ? (amountIn - lastProbedAmountRef.current) * 10_000n / lastProbedAmountRef.current > PROBE_AMOUNT_DELTA_BPS
                : (lastProbedAmountRef.current - amountIn) * 10_000n / lastProbedAmountRef.current > PROBE_AMOUNT_DELTA_BPS);
        const routeChangedSinceProbe = lastProbedRouteKeyRef.current !== routeKey;

        const cooldownPassed = sinceProbe >= lastProbeCooldownRef.current;
        const shouldProbe =
          outRaw > 0n && (cooldownPassed || amountChanged || routeChangedSinceProbe);

        if (shouldProbe) {
          const amountIn5  = (amountIn * PROBE_AMOUNTS[0]) / 100n;
          const amountIn10 = (amountIn * PROBE_AMOUNTS[1]) / 100n;

          if (amountIn5 >= PROBE_MIN_AMOUNT_WEI && amountIn10 >= PROBE_MIN_AMOUNT_WEI) {
            const [p5, p10] = await Promise.all([
              (client as any).readContract({
                address: router,
                abi: YAK_ROUTER_ABI,
                functionName: "findBestPathWithGas",
                args: [ amountIn5, tokenInAddr, tokenOutAddr, steps, gasGwei ],
              }).catch((err: any) => {
                if (PUBLIC_CONFIG.DEBUG) console.debug("[probe -5%] fail", err);
                return null;
              }),
              (client as any).readContract({
                address: router,
                abi: YAK_ROUTER_ABI,
                functionName: "findBestPathWithGas",
                args: [ amountIn10, tokenInAddr, tokenOutAddr, steps, gasGwei ],
              }).catch((err: any) => {
                if (PUBLIC_CONFIG.DEBUG) console.debug("[probe -10%] fail", err);
                return null;
              }),
            ]);

            const extract = (res: any) => {
              if (!res) return null;
              const amts: bigint[]   = res.amounts   ?? res[0] ?? [];
              const adpts: Address[] = res.adapters  ?? res[1] ?? [];
              const pth: Address[]   = res.path      ?? res[2] ?? [];
              const out = amts.length ? amts[amts.length - 1] : 0n;
              return { out, key: makeRouteKey([...(pth ?? []), ...(adpts ?? [])]) };
            };

            const mainKey = routeKey;
            const e5 = extract(p5);
            const e10 = extract(p10);

            // Only accept probes if both use the SAME route as main
            if (e5 && e10 && e5.out > 0n && e10.out > 0n && e5.key === mainKey && e10.key === mainKey) {
              probe5  = { amountInRaw: amountIn5,  outRaw: e5.out };
              probe10 = { amountInRaw: amountIn10, outRaw: e10.out };
              lastProbeAtRef.current = now;
              lastProbeCooldownRef.current = nextCooldown();
              lastProbedAmountRef.current = amountIn;
              lastProbedRouteKeyRef.current = routeKey;
            }
          }
        }

        // --- Compute dynamic slippage & minOut ---
        const dyn = computeDynamicSlippage({
          amountInRaw: amountIn,
          outRaw,
          inDecimals: inDec,
          outDecimals: outDec,
          probe5,
          probe10,
          gasPriceWei: gasRef.current, // **wei** (NOT gwei)
          estGasUnits,
          quoteAgeMs: prevQuoteTsRef.current ? now - prevQuoteTsRef.current : 0,
          recentRates1e18: ratesBufRef.current.values(),
          confidenceLevel: 0.95,
          routeChanged,
          routeChangeBps: 15,
          // Treat UI slippage as a CAP; estimator can go below it
          userMaxSlippageBps: PUBLIC_CONFIG.SLIPPAGE_BPS,
          userMinSlippageBps: 0,
          minFloorBps: 5,
          mevBufferBps: 10,
          staleQuoteMs: PUBLIC_CONFIG.QUOTE_POLL_MS
            ? Math.max(8000, PUBLIC_CONFIG.QUOTE_POLL_MS * 2)
            : 15000,
          staleQuoteBps: 10,
          hardCapBps: 5000,
          isNativeIn: isNative(tokenIn),
          isNativeOut: isNative(tokenOut),
          nativeDecimals: 18,
        });

        const minOutRaw = dyn.minOut;

        // UI state update only if minOut moved by threshold (avoid spam)
        if (!changedByAtLeastBps(lastMinOutRef.current, minOutRaw, PUBLIC_CONFIG.UPDATE_THRESHOLD_BPS)) {
          // skip UI update
        } else {
          const outFormatted    = formatUnits(outRaw, outDec);
          const minOutFormatted = formatUnits(minOutRaw, outDec);

          if (myReq === reqCounter.current && !cancelled) {
            setQuote({
              outRaw,
              minOutRaw,
              outFormatted,
              minOutFormatted,
              path,
              adapters,
              gasUsed: gasEstimate,
              // NEW (optional)
              slippageBps: dyn.slippageBps,
              debugReasons: dyn.debug.reasons,
            });
            lastMinOutRef.current = minOutRaw;
            prevRouteKeyRef.current = routeKey;
            prevQuoteTsRef.current = now;
          }
        }
      } catch (err) {
        if (PUBLIC_CONFIG.DEBUG) console.debug("[yak-quote] tick fail", err);
        if (myReq === reqCounter.current && !cancelled) {
          if (!quote) setQuote(null);
        }
      } finally {
        if (!cancelled) timer = setTimeout(tick, PUBLIC_CONFIG.QUOTE_POLL_MS);
      }
    }

    tick();
    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polling, router, tokenInAddr, tokenOutAddr, amountInHuman]);

  return quote;
}
