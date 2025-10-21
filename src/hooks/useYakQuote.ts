// src/hooks/useYakQuote.ts
import { useEffect, useMemo, useRef, useState } from "react";
import type { Address, PublicClient } from "viem";
import { formatUnits, parseUnits } from "viem";
import { usePublicClient } from "wagmi";
import { YAK_ROUTER_ABI } from "@/abi/yakRouter";
import { PUBLIC_CONFIG } from "@/config/public";
import { getDecimals } from "@/lib/decimals";
import { changedByAtLeastBps } from "@/lib/math";
import { useNetworkFees } from "@/hooks/useNetworkFees";

/**
 * This hook provides *sticky* quotes:
 * - Never drops UI to 0 / "No route" on transient RPC errors.
 * - Dedupes concurrent requests and cancels stale responses.
 * - Only updates when the amountOut changes meaningfully (bps threshold).
 * - Distinguishes 'no-route' from 'error' and preserves the last good quote.
 */

type Params = {
  router: Address;
  tokenIn?: Address | string | null;   // "MON" | 0x... | null
  tokenOut?: Address | string | null;  // "MON" | 0x... | null
  amountInHuman: string;               // "" | "1.23"
  enabled?: boolean;
  slippageBpsOverride?: number;        // optional per-quote override
};

export type YakQuote = {
  // Core numbers
  amountInRaw: bigint;
  amountOutRaw: bigint;
  amountOutHuman: string;
  minOutRaw: bigint;                   // slippage applied
  minOutHuman: string;

  // Route meta
  path: Address[];
  adapters: Address[];
  gasUsed?: bigint;
  gasPriceWei: bigint;

  // Lifecycle
  status: "idle" | "quoting" | "ready" | "no-route" | "error";
  isStale: boolean;                    // true when we're retrying but showing last good
  error?: string;
  lastUpdated: number;                 // ms epoch
  quoteId: number;                     // monotonic; last applied id
};

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";
const isNativeLike = (v?: string | null) =>
  !v || v.toUpperCase?.() === PUBLIC_CONFIG.NATIVE_SYMBOL || v === ZERO_ADDR;

const toRouterAddr = (v?: string | null): Address => {
  if (!v || isNativeLike(v)) return ZERO_ADDR as Address; // our Yak expects 0x0 for native
  return (v as Address);
};

// Extract amountOut from a variety of Yak tuple/struct shapes
function readAmountOut(raw: any): bigint {
  if (!raw) return 0n as bigint;
  if (Array.isArray(raw)) {
    const cand = raw[0];
    try { return BigInt(cand ?? 0); } catch { /* noop */ }
  }
  for (const k of ["amountOut", "output", "amount"]) {
    if (raw[k] != null) {
      try { return BigInt(raw[k]); } catch { /* noop */ }
    }
  }
  return 0n as bigint;
}

function readPath(raw: any): Address[] {
  if (!raw) return [];
  const candidates = Array.isArray(raw)
    ? raw.find((x) => Array.isArray(x) && x.length && typeof x[0] === "string")
    : raw.path ?? raw.tokens ?? [];
  return (candidates ?? []) as Address[];
}

function readAdapters(raw: any): Address[] {
  if (!raw) return [];
  const adapters = Array.isArray(raw)
    ? raw.find((x) => Array.isArray(x) && x.length && typeof x[0] === "string" && x !== readPath(raw))
    : raw.adapters ?? raw.routes ?? [];
  return (adapters ?? []) as Address[];
}

export function useYakQuote({
  router,
  tokenIn,
  tokenOut,
  amountInHuman,
  enabled = true,
  slippageBpsOverride,
}: Params) {
  const client = usePublicClient();
  const { effectiveGasPriceWei } = useNetworkFees(PUBLIC_CONFIG.FEE_REFRESH_MS);

  // Gas ref (don’t thrash renders whenever price ticks)
  const FALLBACK = PUBLIC_CONFIG.GAS_PRICE_WEI_FALLBACK ?? 1_000_000_000n; // 1 gwei fallback
  const gasRef = useRef<bigint>(effectiveGasPriceWei ?? FALLBACK);
  useEffect(() => { if (effectiveGasPriceWei) gasRef.current = effectiveGasPriceWei; }, [effectiveGasPriceWei]);

  // Decimals memoization per chain
  const chainId = (client as any)?.chain?.id ?? PUBLIC_CONFIG.CHAIN_ID ?? 0;
  const decCache = useRef<Map<string, number>>(new Map());

  // Sticky state
  const lastGoodRef = useRef<YakQuote | null>(null);
  const noRouteStrikesRef = useRef<number>(0);
  const counterRef = useRef<number>(0);
  const [quote, setQuote] = useState<YakQuote>(() => ({
    amountInRaw: 0n,
    amountOutRaw: 0n,
    amountOutHuman: "0",
    minOutRaw: 0n,
    minOutHuman: "0",
    path: [],
    adapters: [],
    gasUsed: undefined,
    gasPriceWei: gasRef.current,
    status: "idle",
    isStale: false,
    lastUpdated: 0,
    quoteId: 0,
  }));

  // Resolve decimals safely without stalling quotes
  async function decimalsSafe(addr: Address | null): Promise<number> {
    if (!addr || isNativeLike(addr)) return PUBLIC_CONFIG.NATIVE_DECIMALS ?? 18;
    const key = `${chainId}:${addr.toLowerCase()}`;
    if (decCache.current.has(key)) return decCache.current.get(key)!;
    const d = await getDecimals(client as PublicClient, addr);
    decCache.current.set(key, d);
    return d;
  }

  // Reset on token flip or cleared amount
  useEffect(() => {
    noRouteStrikesRef.current = 0;
    // Reset visible state only if we truly changed the pair
    setQuote((q) => ({
      ...q,
      status: (!amountInHuman || Number(amountInHuman) <= 0) ? "idle" : "quoting",
      isStale: false,
      error: undefined,
      quoteId: q.quoteId, // keep id
    }));
    // do NOT drop lastGoodRef; it allows sticky display while we re-quote
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenIn, tokenOut, chainId]);

  // Core polling loop
  useEffect(() => {
    if (!client || !enabled) return;

    let dead = false;
    let timer: any;
    const pollMs = PUBLIC_CONFIG.QUOTE_POLL_MS ?? 1500;
    const updateBps = BigInt(PUBLIC_CONFIG.QUOTE_UPDATE_BPS ?? 5n); // 0.05% default

    const inAddr = toRouterAddr(tokenIn as string | null);
    const outAddr = toRouterAddr(tokenOut as string | null);

    async function once() {
      if (dead) return;
      const reqId = ++counterRef.current;

      // Pre-validate amount
      const amountNum = Number(amountInHuman || "0");
      if (!amountNum || amountNum <= 0) {
        // No amount → idle; keep last good but not shown as ready
        setQuote((q) => ({ ...q, status: "idle", isStale: false, error: undefined, gasPriceWei: gasRef.current }));
        return;
      }

      // Compute raw input with decimals
      let inDec = PUBLIC_CONFIG.NATIVE_DECIMALS ?? 18;
      let outDec = PUBLIC_CONFIG.NATIVE_DECIMALS ?? 18;
      try {
        inDec = await decimalsSafe(isNativeLike(tokenIn) ? null : (tokenIn as Address));
        outDec = await decimalsSafe(isNativeLike(tokenOut) ? null : (tokenOut as Address));
      } catch {
        // keep defaults
      }

      let amountIn: bigint;
      try {
        amountIn = parseUnits(amountInHuman as `${number}`, inDec);
      } catch {
        setQuote((q) => ({ ...q, status: "error", isStale: !!lastGoodRef.current, error: "Invalid amount.", gasPriceWei: gasRef.current }));
        return;
      }

      // Show 'quoting' if we have no last good yet; otherwise mark stale
      setQuote((q) => ({
        ...q,
        status: lastGoodRef.current ? "ready" : "quoting",
        isStale: !!lastGoodRef.current,
        error: undefined,
        gasPriceWei: gasRef.current,
      }));

      // Call Yak
      try {
        const gasWei = gasRef.current;
        const raw = await (client as PublicClient).readContract({
          address: router,
          abi: YAK_ROUTER_ABI,
          functionName: "findBestPathWithGas",
          args: [amountIn, inAddr, outAddr, BigInt(PUBLIC_CONFIG.MAX_STEPS ?? 4), gasWei],
        }) as any;

        // If a newer request was issued, ignore this response
        if (dead || reqId !== counterRef.current) return;

        const amountOut = readAmountOut(raw);
        const path = readPath(raw);
        const adapters = readAdapters(raw);
        const gasUsed: bigint | undefined = (() => {
          try {
            if (Array.isArray(raw)) {
              const g = raw.find((x) => typeof x === "bigint" || (typeof x === "string" && /^\d+$/.test(x)));
              return g != null ? BigInt(g) : undefined;
            }
            if (raw?.gasUsed != null) return BigInt(raw.gasUsed);
          } catch { /* noop */ }
          return undefined;
        })();

        // No route condition
        if (!path?.length || amountOut === 0n) {
          noRouteStrikesRef.current += 1;
          // Only switch the visible state to "no-route" if we have *no* last good OR multiple consecutive no-route responses.
          const hardNoRoute = !lastGoodRef.current || noRouteStrikesRef.current >= 2;
          setQuote((q) => ({
            ...q,
            status: hardNoRoute ? "no-route" : "ready",
            isStale: !hardNoRoute && !!lastGoodRef.current,
            error: hardNoRoute ? undefined : q.error,
            gasPriceWei: gasWei,
          }));
          return;
        }

        // Successful quote
        noRouteStrikesRef.current = 0;

        const slippageBps = BigInt(slippageBpsOverride ?? PUBLIC_CONFIG.SLIPPAGE_BPS ?? 50); // 0.5% default
        const minOut = amountOut - (amountOut * slippageBps) / 10_000n;

        const next: YakQuote = {
          amountInRaw: amountIn,
          amountOutRaw: amountOut,
          amountOutHuman: formatUnits(amountOut, outDec),
          minOutRaw: minOut,
          minOutHuman: formatUnits(minOut, outDec),
          path,
          adapters,
          gasUsed,
          gasPriceWei: gasWei,
          status: "ready",
          isStale: false,
          error: undefined,
          lastUpdated: Date.now(),
          quoteId: reqId,
        };

        // Update only if changed meaningfully
        const prev = lastGoodRef.current;
        const changed = !prev || changedByAtLeastBps(prev.amountOutRaw, next.amountOutRaw, BigInt(PUBLIC_CONFIG.QUOTE_UPDATE_BPS ?? 10));
        if (changed) {
          lastGoodRef.current = next;
          setQuote(next);
        } else {
          // keep UI but refresh freshness/gas
          setQuote((q) => ({ ...q, status: "ready", isStale: false, lastUpdated: Date.now(), gasPriceWei: gasWei, quoteId: reqId }));
        }
      } catch (err: any) {
        if (dead || reqId !== counterRef.current) return;

        // Do not nuke the UI; keep last good
        const message = (err?.shortMessage || err?.message || "RPC error").toString();
        setQuote((q) => ({
          ...q,
          status: lastGoodRef.current ? "ready" : "error",
          isStale: !!lastGoodRef.current,
          error: message,
          gasPriceWei: gasRef.current,
        }));
      }
    }

    // Start a tick immediately, then schedule
    let suspended = false;
    const kick = async () => {
      if (suspended) return;
      await once();
      if (!dead) timer = setTimeout(kick, pollMs);
    };

    kick();

    return () => {
      dead = true;
      suspended = true;
      if (timer) clearTimeout(timer);
    };
  }, [client, enabled, router, tokenIn, tokenOut, amountInHuman, slippageBpsOverride]);

  // Expose lastGood to consumers that want the sticky snapshot
  const sticky = useMemo(() => {
    return lastGoodRef.current ?? quote;
  }, [quote]);

  return sticky;
}
