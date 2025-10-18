// src/hooks/useYakQuote.ts
import { useEffect, useRef, useState } from "react";
import type { Address } from "viem";
import { formatUnits, parseUnits } from "viem";
import { usePublicClient } from "wagmi";
import { YAK_ROUTER_ABI } from "@/abi/yakRouter";
import { PUBLIC_CONFIG } from "@/config/public";
import { changedByAtLeastBps } from "@/lib/math";
import { useNetworkFees } from "@/hooks/useNetworkFees";

type QuoteState = {
  outRaw: bigint;
  minOutRaw: bigint;
  outFormatted: string;
  minOutFormatted: string;
  path: Address[];       // display path (single or a-leg for split)
  adapters: Address[];   // display adapters
  gasUsed: bigint;
  // --- Split metadata (only when we decided to split) ---
  split?: {
    isSplit: true;
    legA: { amountIn: bigint; minOut: bigint; path: Address[]; adapters: Address[] };
    legB: { amountIn: bigint; minOut: bigint; path: Address[]; adapters: Address[] };
    minTotalOut: bigint;
  };
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

// local helpers (match your codebase)
const ZERO: Address = "0x0000000000000000000000000000000000000000";
const isNative = (v?: string) =>
  !v || v.toUpperCase() === PUBLIC_CONFIG.NATIVE_SYMBOL || v === ZERO;

export function useYakQuote({ router, tokenIn, tokenOut, amountInHuman, enabled = true, slippageBpsOverride }: Params) {
  const client = usePublicClient();
  const { effectiveGasPriceWei } = useNetworkFees(PUBLIC_CONFIG.FEE_REFRESH_MS);
  const FALLBACK = PUBLIC_CONFIG.GAS_PRICE_WEI_FALLBACK;
  const gasRef = useRef<bigint>(effectiveGasPriceWei ?? FALLBACK);

  const [quote, setQuote] = useState<QuoteState | null>(null);
  const [polling, setPolling] = useState(false);
  const reqCounter = useRef(0);
  const lastMinOutRef = useRef<bigint>(0n);

  // Cache WNATIVE and 1 native -> tokenOut price (for gas->tokenOut conversion)
  const wnativeRef = useRef<Address | null>(null);
  const outPer1NativeRef = useRef<{ tokenOut?: Address; value?: bigint }>({});

  useEffect(() => { gasRef.current = effectiveGasPriceWei ?? FALLBACK; }, [effectiveGasPriceWei]);

  useEffect(() => {
    const tokenInAddr  = (isNative(tokenIn)  ? ZERO : (tokenIn as Address)) as Address;
    const tokenOutAddr = (isNative(tokenOut) ? ZERO : (tokenOut as Address)) as Address;

    if (!enabled || !tokenIn || !tokenOut) { setPolling(false); setQuote(null); return; }
    setPolling(true);

    let cancelled = false;
    let timer: any;
    const myReq = ++reqCounter.current;

    // Split knobs (fall back if not present in PUBLIC_CONFIG)
    const SPLIT_ENABLED   = Boolean((PUBLIC_CONFIG as any).SPLIT?.ENABLED ?? true);
    const RATIOS: number[] = (PUBLIC_CONFIG as any).SPLIT?.RATIOS ?? [50, 60, 70, 40, 30];
    const MIN_GAIN_BPS    = BigInt((PUBLIC_CONFIG as any).SPLIT?.MIN_GAIN_BPS ?? 10);    // 0.10%
    const OVERHEAD_GAS    = BigInt((PUBLIC_CONFIG as any).SPLIT?.OVERHEAD_GAS ?? 80000); // extra cost for 2nd leg

    async function ensureWNATIVE(): Promise<Address> {
      if (wnativeRef.current) return wnativeRef.current;
      const w = await (client as any).readContract({ address: router, abi: YAK_ROUTER_ABI, functionName: "WNATIVE", args: [] });
      wnativeRef.current = w as Address;
      return w as Address;
    }

    async function priceGasInTokenOut(): Promise<bigint> {
      // Cache per tokenOut
      if (outPer1NativeRef.current.tokenOut?.toLowerCase() === (tokenOutAddr || ZERO).toLowerCase() && outPer1NativeRef.current.value) {
        return outPer1NativeRef.current.value!;
      }
      const WNATIVE = await ensureWNATIVE();
      // 1e18 WNATIVE -> tokenOut via findBestPath (maxSteps 2)
      const formatted = await (client as any).readContract({
        address: router, abi: YAK_ROUTER_ABI, functionName: "findBestPath",
        args: [ 10n ** 18n, WNATIVE, tokenOutAddr || ZERO, 2n ]
      });
      const amounts: bigint[] = formatted?.amounts ?? formatted?.[0] ?? [];
      const v = amounts.length ? (amounts[amounts.length - 1]) : 0n;
      outPer1NativeRef.current = { tokenOut: tokenOutAddr, value: v };
      return v;
    }

    async function tick() {
      try {
        const SLIP = (slippageBpsOverride ?? PUBLIC_CONFIG.SLIPPAGE_BPS) ?? 500n;
        const maxSteps = BigInt(PUBLIC_CONFIG.MAX_STEPS);
        const gasWei = gasRef.current;

        // Parse amountIn respecting native decimals
        const inDec = isNative(tokenIn) ? PUBLIC_CONFIG.NATIVE_DECIMALS : 18; // most ERC-20s 18 in your list
        const amountIn = parseUnits(amountInHuman || "0", inDec);
        if (amountIn === 0n) { setQuote(null); return; }

        // Addresses for router calls (your router treats ZERO as native in quoting)
        const tokenInAddr  = (isNative(tokenIn)  ? (await ensureWNATIVE()) : (tokenIn as Address)) as Address;
        const tokenOutAddr = (isNative(tokenOut) ? (await ensureWNATIVE()) : (tokenOut as Address)) as Address;

        // --- Baseline (no split) ---
        const base = await (client as any).readContract({
          address: router, abi: YAK_ROUTER_ABI, functionName: "findBestPathWithGas",
          args: [ amountIn, tokenInAddr, tokenOutAddr, maxSteps, gasWei ],
        });
        const baseAmounts: bigint[]   = base?.amounts ?? base?.[0] ?? [];
        const baseAdapters: Address[] = base?.adapters ?? base?.[1] ?? [];
        const basePath: Address[]     = base?.path ?? base?.[2] ?? [];
        const baseGas: bigint         = base?.gasEstimate ?? base?.[3] ?? 0n;
        const baseOut: bigint         = baseAmounts.length ? baseAmounts[baseAmounts.length - 1] : 0n;
        const baseMinOut: bigint      = (baseOut * (10_000n - SLIP)) / 10_000n;

        // Default winner = baseline
        let winner = {
          isSplit: false,
          outRaw: baseOut,
          minOutRaw: baseMinOut,
          path: basePath,
          adapters: baseAdapters,
          gasUsed: baseGas,
          split: undefined as QuoteState["split"],
        };

        if (SPLIT_ENABLED && baseOut > 0n) {
          // Optional split probe: try a few ratios quickly
          const probes = RATIOS
            .map(r => Math.max(1, Math.min(99, Math.floor(r)))) // clamp [1,99]
            .filter((v, i, a) => a.indexOf(v) === i)             // unique
            .map((r) => {
              const aIn = (amountIn * BigInt(r)) / 100n;
              const bIn = amountIn - aIn;
              return { r, aIn, bIn };
            })
            .filter(p => p.aIn > 0n && p.bIn > 0n);

          // Price overhead gas in tokenOut once
          const tokenOutPer1Native = await priceGasInTokenOut();
          const overheadOut = (tokenOutPer1Native && gasWei)
            ? ((tokenOutPer1Native * (gasWei * OVERHEAD_GAS)) / (10n ** 18n)) // convert extra gas to tokenOut
            : 0n;

          for (const p of probes) {
            const [A, B] = await Promise.all([
              (client as any).readContract({
                address: router, abi: YAK_ROUTER_ABI, functionName: "findBestPathWithGas",
                args: [ p.aIn, tokenInAddr, tokenOutAddr, maxSteps, gasWei ],
              }),
              (client as any).readContract({
                address: router, abi: YAK_ROUTER_ABI, functionName: "findBestPathWithGas",
                args: [ p.bIn, tokenInAddr, tokenOutAddr, maxSteps, gasWei ],
              }),
            ]);

            const aAmounts: bigint[] = A?.amounts ?? A?.[0] ?? [];
            const bAmounts: bigint[] = B?.amounts ?? B?.[0] ?? [];
            if (!aAmounts.length || !bAmounts.length) continue;

            const aOut = aAmounts[aAmounts.length - 1];
            const bOut = bAmounts[bAmounts.length - 1];
            const sumOut = aOut + bOut;

            // Require improvement above threshold + overhead
            const need = (winner.outRaw * (10_000n + MIN_GAIN_BPS)) / 10_000n;
            if (sumOut <= need + overheadOut) continue;

            // Build legs with per-leg minOut (slippage applied per leg)
            const aAdapters: Address[] = A?.adapters ?? A?.[1] ?? [];
            const aPath: Address[]     = A?.path ?? A?.[2] ?? [];
            const bAdapters: Address[] = B?.adapters ?? B?.[1] ?? [];
            const bPath: Address[]     = B?.path ?? B?.[2] ?? [];

            if (!aPath.length || !bPath.length) continue;

            const aMin = (aOut * (10_000n - SLIP)) / 10_000n;
            const bMin = (bOut * (10_000n - SLIP)) / 10_000n;
            const minTotalOut = aMin + bMin;

            // Winner becomes split
            winner = {
              isSplit: true,
              outRaw: sumOut,
              minOutRaw: minTotalOut, // conservative: sum of per-leg mins
              path: aPath,            // display first leg path (UI only)
              adapters: aAdapters,    // display first leg adapters (UI only)
              gasUsed: (A?.gasEstimate ?? A?.[3] ?? 0n) + (B?.gasEstimate ?? B?.[3] ?? 0n),
              split: {
                isSplit: true,
                legA: { amountIn: p.aIn, minOut: aMin, path: aPath, adapters: aAdapters },
                legB: { amountIn: p.bIn, minOut: bMin, path: bPath, adapters: bAdapters },
                minTotalOut,
              },
            };
            // Keep looping; later ratios can still beat the current split
          }
        }

        const outDec = isNative(tokenOut) ? PUBLIC_CONFIG.NATIVE_DECIMALS : 18;
        const outFormatted     = formatUnits(winner.outRaw, outDec);
        const minOutFormatted  = formatUnits(winner.minOutRaw, outDec);

        if (myReq !== reqCounter.current || cancelled) return;

        // Preserve your throttling rule
        if (!changedByAtLeastBps(lastMinOutRef.current, winner.minOutRaw, PUBLIC_CONFIG.UPDATE_THRESHOLD_BPS)) {
          // no state update
        } else {
          lastMinOutRef.current = winner.minOutRaw;
          setQuote({
            outRaw: winner.outRaw,
            minOutRaw: winner.minOutRaw,
            outFormatted,
            minOutFormatted,
            path: winner.path,
            adapters: winner.adapters,
            gasUsed: winner.gasUsed,
            split: winner.split,
          });
        }
      } catch {
        if (!cancelled) setQuote(null);
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
