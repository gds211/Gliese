// src/hooks/useDynamicSlippage.ts
import { useEffect, useMemo, useRef, useState } from "react";
import { PUBLIC_CONFIG } from "@/config/public";

// ----- Types -----
export type SimpleQuote = {
  /** Per-unit price proxy: amount out for ~1 unit of input, human formatted. */
  outFormatted?: string | number | null;
  // optional: updatedAtMs?: number;
};
//testing

export type UseDynamicSlippageArgs = {
  enabled: boolean;

  /** Preferred volatility source: per-unit output for ~1 input unit. */
  unitQuote?: SimpleQuote | null;

  /** User-sized total out (we normalize it to per-unit internally). */
  userOutFormatted?: string | number | null;

  /** User human input size (same unit as UI input). */
  userInHuman?: string | number | null;

  /** Hop count for path pad. */
  pathLength?: number;

  /** Optional notional in USD for MEV cushion calibration. */
  notionalUsd?: number | null;

  /**
   * OPTIONAL local elasticity probe. If provided AND enabled in config,
   * we'll occasionally call this to get per-unit outputs at two close sizes
   * to estimate a local slope/curvature for size impact prediction.
   * Return per-unit OUT (amountOut/amountIn) or null on failure.
   */
  probePerUnit?: (amountInHuman: number) => Promise<number | null>;
  /** Reset state when trade context changes (pair, direction, pool/path shape, etc.). */
  resetKey?: string | number | boolean | null;
};

export type DynamicSlippage = { bps: bigint; bpsNumber: number };

// ----- Utils -----
const toNum = (x: unknown): number | null => {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
};
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** In-place nth element (quickselect) to get quantile without full sort (small N safe) */
function quantileAbs(returns: number[], q: number): number {
  if (!returns.length) return 0;
  const arr = returns.map((x) => Math.abs(x));
  const k = Math.max(0, Math.min(arr.length - 1, Math.floor(q * (arr.length - 1))));
  // small N -> simple sort is fine, readable and stable
  arr.sort((a, b) => a - b);
  return arr[k];
}

/** EWMA variance on log-returns (dimensionless). */
function useEwmaSigma(active: boolean, price: number | null, alpha: number, resetSeed?: unknown) {
  const last = useRef<number | null>(null);
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!active || price === null || price <= 0) return;
    if (last.current && last.current > 0) {
      const r = Math.log(price / last.current);
      setV((prev) => alpha * (r * r) + (1 - alpha) * prev);
    }
    last.current = price;
  }, [active, price, alpha]);
  // hard reset on pair change
  useEffect(() => { last.current = null; setV(0); }, [resetSeed]);
  return Math.sqrt(v);
}

/** Rolling ring-buffer of log-returns for robust quantile vol. */
function useReturnWindow(active: boolean, price: number | null, capacity: number, resetSeed?: unknown) {
  const last = useRef<number | null>(null);
  const buf = useRef<number[]>([]);
  useEffect(() => {
    if (!active || price === null || price <= 0) return;
    if (last.current && last.current > 0) {
      const r = Math.log(price / last.current);
      const a = buf.current;
      if (a.length >= capacity) a.shift();
      a.push(r);
    }
    last.current = price;
  }, [active, price, capacity]);
  // hard reset on pair change
  useEffect(() => { last.current = null; buf.current = []; }, [resetSeed]);
  return buf.slice;
}

/** Piecewise MEV cushion by notional USD. */
function mevBpsByUsd(usd: number | null | undefined, protectedFlow: boolean): number {
  if (usd == null || !Number.isFinite(usd)) return 0;
  // Reduce cushion if flow is MEV-protected (Flashbots/MEV-Blocker/intents)
  const scale = protectedFlow ? 0.5 : 1.0;
  if (usd < 50) return 0;
  if (usd < 500) return Math.round(8 * scale);
  if (usd < 5_000) return Math.round(15 * scale);
  if (usd < 25_000) return Math.round(25 * scale);
  return Math.round(35 * scale);
}

// ----- Main hook -----
export function useDynamicSlippageBps({
  enabled,
  unitQuote,
  userOutFormatted,
  userInHuman,
  pathLength = 1,
  notionalUsd = null,
  probePerUnit,
  resetKey,
}: UseDynamicSlippageArgs): DynamicSlippage {
  // ---- Config ----
  const CFG = (PUBLIC_CONFIG as any).AUTO_SLIPPAGE ?? {};
  const BASE_BPS: number = toNum(CFG.BASE_BPS) ?? 30;          // 0.30%
  const MIN_BPS: number = toNum(CFG.MIN_BPS) ?? 5;             // 0.05%
  const MAX_BPS: number = toNum(CFG.MAX_BPS) ?? 500;           // 5.00%

  // Volatility
  const EWMA_ALPHA: number = toNum(CFG.EWMA_ALPHA) ?? 0.20;
  const QRET_WINDOW: number = toNum(CFG.QRET_WINDOW) ?? 48;    // last N returns
  const QRET_QUANTILE: number = toNum(CFG.QRET_QUANTILE) ?? 0.95; // 95% tail
  const VOL_SCALE: number = toNum(CFG.VOL_SCALE) ?? 1.0;       // global vol knob

  // Size impact
  const SIZE_FACTOR: number = toNum(CFG.SIZE_FACTOR) ?? 1.0;

  // Hops / MEV / Hysteresis
  const PER_HOP_BPS: number = toNum(CFG.PER_HOP_BPS) ?? 4;
  const MEV_PROTECTED: boolean = Boolean(CFG.MEV_PROTECTED ?? false);
  const UP_HYST_BPS: number = toNum(CFG.UP_HYSTERESIS_BPS) ?? 3;
  const DOWN_HYST_BPS: number = toNum(CFG.DOWN_HYSTERESIS_BPS) ?? 6;
  const COOL_OFF_BPS_PER_SEC: number = toNum(CFG.COOL_OFF_BPS_PER_SEC) ?? 1; // gentle decay

  // Elasticity probe (optional)
  const ELASTICITY_PROBE: boolean = Boolean(CFG.ELASTICITY_PROBE ?? false);
  const PROBE_EPS: number = toNum(CFG.PROBE_EPS) ?? 0.02;      // +2% size nudge
  const PROBE_MIN_INTERVAL_MS: number = toNum(CFG.PROBE_MIN_INTERVAL_MS) ?? 2500;

  // ---- Per-unit sources ----
  const unitPerUnit = toNum(unitQuote?.outFormatted); // per-unit OUT@~1in
  const userOut = toNum(userOutFormatted);
  const userIn = toNum(userInHuman);
  const userPerUnit = useMemo(() => {
    if (userOut && userOut > 0 && userIn && userIn > 0) return userOut / userIn;
    return null;
  }, [userOut, userIn]);

  // Preferred price source for volatility: unit quote; fallback to normalized user quote
  const priceSource = unitPerUnit ?? userPerUnit ?? null;

  // ---- Volatility (robust) ----
  const sigma = useEwmaSigma(enabled, priceSource, EWMA_ALPHA);
  const window = useReturnWindow(enabled, priceSource, QRET_WINDOW);
  const qAbs = quantileAbs(window, QRET_QUANTILE); // tail of |returns|

  // Convert to bps (small log-returns ≈ percent change)
  const volBpsEWMA = enabled ? Math.ceil(VOL_SCALE * 10_000 * sigma) : 0;
  const volBpsQ = enabled ? Math.ceil(VOL_SCALE * 10_000 * qAbs) : 0;
  const volBps = Math.max(volBpsEWMA, volBpsQ);

  // ---- Size impact (two modes) ----
  // Fallback: per-unit vs per-unit (1-unit vs user)
  let sizeImpactBps = 0;
  if (enabled && unitPerUnit && unitPerUnit > 0 && userPerUnit && userPerUnit > 0) {
    const impact = (unitPerUnit - userPerUnit) / unitPerUnit;
    sizeImpactBps = Math.max(0, Math.ceil(SIZE_FACTOR * impact * 10_000));
  }

  // Optional local elasticity probe improves size estimate for curved CLMM segments
  const [probeBps, setProbeBps] = useState<number | null>(null);
  const lastProbeAt = useRef<number>(0);
  useEffect(() => {
    if (
      !enabled ||
      !ELASTICITY_PROBE ||
      !probePerUnit ||
      !userIn ||
      !(userIn > 0) ||
      !Number.isFinite(userIn)
    ) {
      setProbeBps(null);
      return;
    }
    const now = Date.now();
    if (now - lastProbeAt.current < PROBE_MIN_INTERVAL_MS) return;

    let cancelled = false;
    const run = async () => {
      try {
        const baseIn = userIn;
        const bumpIn = baseIn * (1 + PROBE_EPS);
        const [ppBase, ppBump] = await Promise.all([
          probePerUnit!(baseIn),
          probePerUnit!(bumpIn),
        ]);
        if (cancelled || ppBase == null || ppBase <= 0 || ppBump == null || ppBump <= 0) {
          setProbeBps(null);
          return;
        }
        // local slope: drop in per-unit for +ε input
        const drop = Math.max(0, ppBase - ppBump);
        // extrapolate to full distance between 1-unit and user size
        // (safe, conservative: multiply by distance in units of ε)
        const dist = Math.max(0, baseIn - 1);
        const steps = dist / (baseIn * PROBE_EPS || 1); // ~how many +ε bumps
        const predicted = Math.min(ppBase, drop * steps); // cannot exceed ppBase
        const bps = Math.ceil((predicted / ppBase) * 10_000);
        setProbeBps(bps);
        lastProbeAt.current = Date.now();
      } catch {
        setProbeBps(null);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [
    enabled,
    ELASTICITY_PROBE,
    probePerUnit,
    userIn,
    PROBE_EPS,
    PROBE_MIN_INTERVAL_MS,
  ]);

  const sizeBps = probeBps != null ? Math.max(sizeImpactBps, probeBps) : sizeImpactBps;

  // ---- Hop & MEV ----
  const extraHops = Math.max(0, (pathLength ?? 1) - 1);
  const hopBps = enabled ? extraHops * PER_HOP_BPS : 0;
  const mevBps = enabled ? mevBpsByUsd(notionalUsd, MEV_PROTECTED) : 0;

  // ---- Compose target ----
  const rawTarget = enabled ? BASE_BPS + volBps + sizeBps + hopBps + mevBps : BASE_BPS;

  // ---- Hysteresis + gentle cool-off ----
  const lastRef = useRef<number>(BASE_BPS);
  const [coolTick, setCoolTick] = useState(0);
  // Reset the held value when the trade context changes so a previous spike
  // doesn’t leak into a different pair/route/amount regime.
  useEffect(() => {
    lastRef.current = BASE_BPS;
  }, [resetKey, enabled, BASE_BPS]);

  // Cool-off ticker (decay toward new target to avoid sticky highs)
  useEffect(() => {
    if (!enabled || COOL_OFF_BPS_PER_SEC <= 0) return;
    const id = setInterval(() => setCoolTick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, [enabled, COOL_OFF_BPS_PER_SEC]);

  let target = rawTarget;
  const delta = rawTarget - lastRef.current;
  if (delta > 0 && delta < UP_HYST_BPS) {
    target = lastRef.current; // ignore tiny uptick
  } else if (delta < 0 && -delta < DOWN_HYST_BPS) {
    target = lastRef.current; // ignore tiny downtick
  }

  // Gentle decay: if raw target is lower than our held value, step down gradually
  useEffect(() => {
    if (!enabled || COOL_OFF_BPS_PER_SEC <= 0) return;
    if (rawTarget < lastRef.current) {
      const gap = lastRef.current - rawTarget;
      // Drop at least COOL_OFF_BPS_PER_SEC, and also ~20% of the gap for fast recovery.
      const step = Math.max(COOL_OFF_BPS_PER_SEC, Math.ceil(gap * 0.2));
      lastRef.current = Math.max(rawTarget, lastRef.current - step);
    }
  }, [coolTick, enabled, COOL_OFF_BPS_PER_SEC, rawTarget]);

  target = clamp(target, MIN_BPS, MAX_BPS);
  if (target !== lastRef.current) lastRef.current = target;

  const bpsNumber = Math.round(target);
  const bps = BigInt(bpsNumber);
  return { bps, bpsNumber };
}

export default useDynamicSlippageBps;
