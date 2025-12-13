// src/hooks/useDynamicSlippage.ts
import { useEffect, useMemo, useRef, useState } from "react";
import { PUBLIC_CONFIG } from "@/config/public";

// ----- Types -----
export type SimpleQuote = {
  outFormatted?: string | number | null;
};

export type UseDynamicSlippageArgs = {
  enabled: boolean;
  unitQuote?: SimpleQuote | null;
  userOutFormatted?: string | number | null;
  userInHuman?: string | number | null;
  pathLength?: number;
  notionalUsd?: number | null;
  probePerUnit?: (amountInHuman: number) => Promise<number | null>;
  resetKey?: string | number | boolean | null;
};

export type DynamicSlippage = { bps: bigint; bpsNumber: number };

// ----- Utils -----
const toNum = (x: unknown): number | null => {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
};
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

function quantileAbs(returns: number[], q: number): number {
  if (!returns.length) return 0;
  const arr = returns.map((x) => Math.abs(x));
  const k = Math.max(0, Math.min(arr.length - 1, Math.floor(q * (arr.length - 1))));
  arr.sort((a, b) => a - b);
  return arr[k];
}

/** EWMA variance with synchronous reset support */
function useEwmaSigma(
  active: boolean,
  price: number | null,
  alpha: number,
  resetKey?: unknown
) {
  const last = useRef<number | null>(null);
  const [v, setV] = useState(0);
  
  // Track resetKey to force synchronous reset logic
  const prevKey = useRef(resetKey);
  const keyChanged = prevKey.current !== resetKey;
  
  if (keyChanged) {
    prevKey.current = resetKey;
    last.current = null;
    // We can't set state during render safely, but we can treat 'v' as 0
  }

  // Effect to clear state after render
  useEffect(() => {
    if (keyChanged) setV(0);
  }, [keyChanged]); // Run when key changes

  useEffect(() => {
    // If the key just changed this frame, skip calculation to avoid mixing contexts
    if (keyChanged) return;
    
    if (!active || price === null || price <= 0) return;
    if (last.current && last.current > 0) {
      const r = Math.log(price / last.current);
      setV((prev) => alpha * (r * r) + (1 - alpha) * prev);
    }
    last.current = price;
  }, [active, price, alpha, keyChanged]);

  // Return 0 immediately if we are in a reset frame
  return keyChanged ? 0 : Math.sqrt(v);
}

/** Return window with synchronous reset support */
function useReturnWindow(
  active: boolean,
  price: number | null,
  capacity: number,
  resetKey?: unknown
) {
  const last = useRef<number | null>(null);
  const buf = useRef<number[]>([]);
  
  const prevKey = useRef(resetKey);
  const keyChanged = prevKey.current !== resetKey;

  if (keyChanged) {
    prevKey.current = resetKey;
    last.current = null;
    buf.current = [];
  }

  useEffect(() => {
    if (keyChanged) return;

    if (!active || price === null || price <= 0) return;
    if (last.current && last.current > 0) {
      const r = Math.log(price / last.current);
      const a = buf.current;
      if (a.length >= capacity) a.shift();
      a.push(r);
    }
    last.current = price;
  }, [active, price, capacity, keyChanged]);

  // Return empty immediately if in reset frame
  return keyChanged ? [] : buf.current;
}

function mevBpsByUsd(usd: number | null | undefined, protectedFlow: boolean): number {
  if (usd == null || !Number.isFinite(usd)) return 0;
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
  const BASE_BPS: number = toNum(CFG.BASE_BPS) ?? 30;
  const MIN_BPS: number = toNum(CFG.MIN_BPS) ?? 5;
  const MAX_BPS: number = toNum(CFG.MAX_BPS) ?? 500;

  const EWMA_ALPHA: number = toNum(CFG.EWMA_ALPHA) ?? 0.20;
  const QRET_WINDOW: number = toNum(CFG.QRET_WINDOW) ?? 48;
  const QRET_QUANTILE: number = toNum(CFG.QRET_QUANTILE) ?? 0.95;
  const VOL_SCALE: number = toNum(CFG.VOL_SCALE) ?? 1.0;
  const SIZE_FACTOR: number = toNum(CFG.SIZE_FACTOR) ?? 1.0;
  const PER_HOP_BPS: number = toNum(CFG.PER_HOP_BPS) ?? 4;
  const MEV_PROTECTED: boolean = Boolean(CFG.MEV_PROTECTED ?? false);
  const UP_HYST_BPS: number = toNum(CFG.UP_HYSTERESIS_BPS) ?? 3;
  const DOWN_HYST_BPS: number = toNum(CFG.DOWN_HYSTERESIS_BPS) ?? 6;
  const COOL_OFF_BPS_PER_SEC: number = toNum(CFG.COOL_OFF_BPS_PER_SEC) ?? 1;

  const ELASTICITY_PROBE: boolean = Boolean(CFG.ELASTICITY_PROBE ?? false);
  const PROBE_EPS: number = toNum(CFG.PROBE_EPS) ?? 0.02;
  const PROBE_MIN_INTERVAL_MS: number = toNum(CFG.PROBE_MIN_INTERVAL_MS) ?? 2500;

  // ---- Synchronous Reset Logic ----
  const resetRef = useRef(resetKey);
  const lastRef = useRef<number>(BASE_BPS);
  const lastProbeAt = useRef<number>(0);

  const keyChanged = resetRef.current !== resetKey;
  if (keyChanged) {
    resetRef.current = resetKey;
    // Reset immediately to avoid stale state logic
    lastRef.current = BASE_BPS;
    lastProbeAt.current = 0;
  }

  // ---- Per-unit sources ----
  const unitPerUnit = toNum(unitQuote?.outFormatted);
  const userOut = toNum(userOutFormatted);
  const userIn = toNum(userInHuman);
  const userPerUnit = useMemo(() => {
    if (userOut && userOut > 0 && userIn && userIn > 0) return userOut / userIn;
    return null;
  }, [userOut, userIn]);

  const priceSource = unitPerUnit ?? userPerUnit ?? null;

  // ---- Volatility ----
  const sigma = useEwmaSigma(enabled, priceSource, EWMA_ALPHA, resetKey);
  const window = useReturnWindow(enabled, priceSource, QRET_WINDOW, resetKey);
  const qAbs = quantileAbs(window, QRET_QUANTILE);

  const volBpsEWMA = enabled ? Math.ceil(VOL_SCALE * 10_000 * sigma) : 0;
  const volBpsQ = enabled ? Math.ceil(VOL_SCALE * 10_000 * qAbs) : 0;
  const volBps = Math.max(volBpsEWMA, volBpsQ);

  // ---- Size impact ----
  let sizeImpactBps = 0;
  if (enabled && unitPerUnit && unitPerUnit > 0 && userPerUnit && userPerUnit > 0) {
    const impact = (unitPerUnit - userPerUnit) / unitPerUnit;
    sizeImpactBps = Math.max(0, Math.ceil(SIZE_FACTOR * impact * 10_000));
  }

  // Optional probe
  const [probeBps, setProbeBps] = useState<number | null>(null);
  
  useEffect(() => { 
    // Effect reset for state
    if (keyChanged) setProbeBps(null);
  }, [keyChanged]);

  useEffect(() => {
    if (keyChanged || !enabled || !ELASTICITY_PROBE || !probePerUnit || !userIn || !(userIn > 0)) {
      if (!probeBps) setProbeBps(null); // avoid loop
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
          probePerUnit(baseIn),
          probePerUnit(bumpIn),
        ]);
        if (cancelled || ppBase == null || ppBase <= 0 || ppBump == null || ppBump <= 0) {
          setProbeBps(null);
          return;
        }
        const drop = Math.max(0, ppBase - ppBump);
        const dist = Math.max(0, baseIn - 1);
        const steps = dist / (baseIn * PROBE_EPS || 1);
        const predicted = Math.min(ppBase, drop * steps);
        const bps = Math.ceil((predicted / ppBase) * 10_000);
        setProbeBps(bps);
        lastProbeAt.current = Date.now();
      } catch {
        setProbeBps(null);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [enabled, ELASTICITY_PROBE, probePerUnit, userIn, keyChanged]);

  const sizeBps = probeBps != null ? Math.max(sizeImpactBps, probeBps) : sizeImpactBps;

  // ---- Hop & MEV ----
  const extraHops = Math.max(0, (pathLength ?? 1) - 1);
  const hopBps = enabled ? extraHops * PER_HOP_BPS : 0;
  const mevBps = enabled ? mevBpsByUsd(notionalUsd, MEV_PROTECTED) : 0;

  // ---- Compose ----
  // If we just reset, we only use BASE_BPS this frame to be safe
  const rawTarget = (enabled && !keyChanged) ? BASE_BPS + volBps + sizeBps + hopBps + mevBps : BASE_BPS;

  // ---- Hysteresis + Cool-off ----
  const [coolTick, setCoolTick] = useState(0);

  // Cool-off ticker
  useEffect(() => {
    if (!enabled || COOL_OFF_BPS_PER_SEC <= 0) return;
    const id = setInterval(() => setCoolTick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, [enabled, COOL_OFF_BPS_PER_SEC]);

  // Gentle decay logic
  useEffect(() => {
    if (!enabled || COOL_OFF_BPS_PER_SEC <= 0 || keyChanged) return;
    if (rawTarget < lastRef.current) {
      const gap = lastRef.current - rawTarget;
      const step = Math.max(COOL_OFF_BPS_PER_SEC, Math.ceil(gap * 0.2));
      lastRef.current = Math.max(rawTarget, lastRef.current - step);
    }
  }, [coolTick, enabled, COOL_OFF_BPS_PER_SEC, rawTarget, keyChanged]);

  let target = rawTarget;
  
  // Only apply hysteresis if we aren't in a reset frame
  if (!keyChanged) {
    const delta = rawTarget - lastRef.current;
    if (delta > 0 && delta < UP_HYST_BPS) {
      target = lastRef.current; 
    } else if (delta < 0 && -delta < DOWN_HYST_BPS) {
      target = lastRef.current; 
    }
  }

  target = clamp(target, MIN_BPS, MAX_BPS);
  
  // Update ref for next frame
  if (target !== lastRef.current) lastRef.current = target;

  const bpsNumber = Math.round(target);
  const bps = BigInt(bpsNumber);
  return { bps, bpsNumber };
}

export default useDynamicSlippageBps;
