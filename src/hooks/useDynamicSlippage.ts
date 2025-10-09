// src/hooks/useDynamicSlippage.ts
import { useEffect, useMemo, useRef, useState } from "react";
import { PUBLIC_CONFIG } from "@/config/public";
import type { QuoteState } from "@/hooks/useYakQuote";

/**
 * Dynamic slippage:
 *  - EWMA volatility from 1-unit quote
 *  - Immediate up, hysteretic down
 *  - Size-aware top-up with ADAPTIVE factor (based on measured price impact)
 *  - Per-hop + latency buffers
 * Zero extra RPCs.
 */
export type UseDynamicSlippageArgs = {
  enabled: boolean;
  unitQuote: QuoteState | null | undefined;           // use outFormatted as clean price proxy
  userOutFormatted?: string | number | null;          // sized quote out; for size top-up
  pathLength?: number;                                 // hop buffer
};

export function useDynamicSlippageBps({
  enabled,
  unitQuote,
  userOutFormatted,
  pathLength = 1,
}: UseDynamicSlippageArgs) {
  // --- Config (safe defaults) ---
  const CFG = (PUBLIC_CONFIG as any).AUTO_SLIPPAGE ?? {};
  const BASE_BPS: number = Number(CFG.BASE_BPS ?? 50n);            // 0.50%
  const MIN_BPS: number = Number(CFG.MIN_BPS ?? 10n);              // 0.10%
  const MAX_BPS: number = Number(CFG.MAX_BPS ?? 500n);            // 5%
  const K_SIGMA: number = CFG.K_SIGMA ?? 3;
  const HYSTERESIS_BPS: number = CFG.HYSTERESIS_BPS ?? 10;
  const EXTRA_PER_HOP_BPS: number = Number(CFG.EXTRA_PER_HOP_BPS ?? 5n);
  const POLL_MS: number = PUBLIC_CONFIG.QUOTE_POLL_MS ?? 2000;

  // EWMA memory + adaptive size top-up shape
  const EWMA_LAMBDA: number = CFG.EWMA_LAMBDA ?? 0.85;
  const IMP_MIN: number = CFG.IMPACT_TOPUP_MIN ?? 0.35;           // min factor
  const IMP_MAX: number = CFG.IMPACT_TOPUP_MAX ?? 0.75;           // max factor
  const IMP_L_BPS: number = CFG.IMPACT_TOPUP_L_BPS ?? 25;         // 0.25%
  const IMP_H_BPS: number = CFG.IMPACT_TOPUP_H_BPS ?? 250;        // 2.50%

  // --- Helpers ---
  const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
  const invLerp = (a: number, b: number, v: number) => (a === b ? 1 : clamp((v - a) / (b - a), 0, 1));
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  // --- State/refs for EWMA variance of returns ---
  const ewmaVarRef = useRef<number | null>(null);
  const lastPriceRef = useRef<number | null>(null);
  const warmupCountRef = useRef<number>(0);

  const lastBpsRef = useRef<number>(BASE_BPS);
  const [bps, setBps] = useState<number>(BASE_BPS);

  // Ingest new 1-unit price each tick
  useEffect(() => {
    if (!enabled || !unitQuote || unitQuote.outFormatted == null) return;
    const p = Number(unitQuote.outFormatted);
    if (!Number.isFinite(p) || p <= 0) return;

    const last = lastPriceRef.current;
    if (last != null) {
      const r = p / last - 1; // signed return
      const r2 = r * r;
      const prevVar = ewmaVarRef.current ?? r2;
      const v = EWMA_LAMBDA * prevVar + (1 - EWMA_LAMBDA) * r2;
      ewmaVarRef.current = v;
      warmupCountRef.current = Math.min(999, warmupCountRef.current + 1);
    } else {
      ewmaVarRef.current = 0;
      warmupCountRef.current = 1;
    }
    lastPriceRef.current = p;
  }, [enabled, unitQuote?.outFormatted, EWMA_LAMBDA]);

  // Compute bps from EWMA + buffers + adaptive size top-up
  useEffect(() => {
    if (!enabled) {
      setBps(BASE_BPS);
      lastBpsRef.current = BASE_BPS;
      return;
    }

    const hasVar = ewmaVarRef.current != null && warmupCountRef.current >= 2;
    let stdBps = 0;
    if (hasVar) {
      const std = Math.sqrt(Math.max(ewmaVarRef.current as number, 0));
      stdBps = Math.round(std * 10_000); // → bps
    }

    // Volatility component
    const volComponent = K_SIGMA * stdBps;

    // Latency buffer: light proportional uplift (e.g., ~+20% at 2s)
    const latencyMultiplier = 1 + Math.min(1, Math.max(0, POLL_MS / 10_000));
    const latencyBps = Math.round(volComponent * (latencyMultiplier - 1));

    // Hop buffer
    const hopBps = Math.max(0, pathLength - 1) * EXTRA_PER_HOP_BPS;

    // Size-aware top-up with ADAPTIVE factor
    let impactTopUpBps = 0;
    const unitOut = Number(unitQuote?.outFormatted ?? NaN);
    const userOut = Number(userOutFormatted ?? NaN);

    if (Number.isFinite(unitOut) && unitOut > 0 && Number.isFinite(userOut) && userOut >= 0) {
      const impact = (unitOut - userOut) / unitOut;       // 0..1 (share lost due to size/route)
      const impactBps = Math.max(0, Math.round(impact * 10_000));
      // Factor rises linearly from IMP_MIN at IMP_L_BPS to IMP_MAX at IMP_H_BPS (clamped).
      const t = invLerp(IMP_L_BPS, IMP_H_BPS, impactBps);
      const factor = lerp(IMP_MIN, IMP_MAX, t);
      impactTopUpBps = Math.ceil(factor * impactBps);
    }

    // Assemble
    let proposed =
      (hasVar ? BASE_BPS + volComponent + latencyBps : Math.min(MAX_BPS, Math.max(BASE_BPS, MIN_BPS))) +
      hopBps +
      impactTopUpBps;

    // Clamp + hysteresis (instant up, cautious down)
    proposed = Math.min(MAX_BPS, Math.max(MIN_BPS, Math.round(proposed)));
    const last = lastBpsRef.current;
    const next = proposed >= last ? proposed : (last - proposed >= HYSTERESIS_BPS ? proposed : last);

    lastBpsRef.current = next;
    setBps(next);
  }, [
    enabled,
    pathLength,
    K_SIGMA,
    HYSTERESIS_BPS,
    EXTRA_PER_HOP_BPS,
    POLL_MS,
    IMP_MIN,
    IMP_MAX,
    IMP_L_BPS,
    IMP_H_BPS,
    unitQuote?.outFormatted,
    userOutFormatted,
  ]);

  const bpsBig: bigint = useMemo(() => BigInt(bps), [bps]);
  const label: string = useMemo(() => `${(bps / 100).toFixed(2)}%`, [bps]);

  return { bps: bpsBig, bpsNumber: bps, label };
}

