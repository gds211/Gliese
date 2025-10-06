// src/lib/dynamicSlippage.ts
// Data-driven dynamic slippage estimator (no token classes).
// Signals:
// • Dual-probe price impact + slope (−5% / −10% size)
// • Rolling micro-vol (1e18 fixed-point) + 95% confidence buffer from log-returns
// • Gas/size adjustment in native terms (all bigint math, deterministic)
// • Stale-quote & MEV buffers, optional route-change guard
// Outputs: slippageBps + minOut (Yak-ready)

import type { Address } from "viem";

// ----------------------------- Types ------------------------------

export interface DynSlipInputs {
  // Main quote:
  amountInRaw: bigint;         // raw units of tokenIn
  outRaw: bigint;              // raw units of tokenOut
  inDecimals: number;
  outDecimals: number;

  // Optional dual probes for price-impact slope:
  probe5?:  { amountInRaw: bigint; outRaw: bigint }; // ~ -5%
  probe10?: { amountInRaw: bigint; outRaw: bigint }; // ~ -10%

  // Environment signals:
  gasPriceWei?: bigint;        // native gas price (wei)
  estGasUnits?: number;        // estimated gas for the swap
  quoteAgeMs?: number;         // ms since main quote
  recentRates1e18?: bigint[];  // rolling outPerIn rates (1e18 fixed-point)

  // Confidence & route-change guards:
  confidenceLevel?: number;    // e.g., 0.95 (default)
  routeChanged?: boolean;      // set true if Yak route fingerprint changed
  routeChangeBps?: number;     // add-on when route changes (default +15 bps)

  // Policy/caps:
  userMaxSlippageBps?: number; // UI cap (e.g., 300 = 3.00%). If omitted, defaults to hardCap.
  userMinSlippageBps?: number; // optional user floor (default 0)
  minFloorBps?: number;        // global soft floor (default 5 = 0.05%)
  mevBufferBps?: number;       // +bps for MEV window (default 10)
  staleQuoteMs?: number;       // threshold for stale quotes (default 15_000)
  staleQuoteBps?: number;      // +bps if stale (default 10)
  hardCapBps?: number;         // absolute clamp (default 5000 = 50%)

  // Native context for gas/size heuristic:
  isNativeIn?: boolean;        // true if tokenIn is native
  isNativeOut?: boolean;       // true if tokenOut is native
  nativeDecimals?: number;     // defaults to 18 if omitted

  // (Optional) token info for logging/UX – not used by the estimator
  inToken?: { address?: Address; symbol?: string };
  outToken?: { address?: Address; symbol?: string };
}

export interface DynSlipResult {
  slippageBps: number;   // final tolerance in bps
  minOut: bigint;        // outRaw * (1 - bps/10000)
  debug: {
    floorBps: number;
    capBps: number;
    userCapBps: number;
    priceImpactBps: number;
    impactSlopeBps: number;
    volBps: number;
    confBps: number;
    gasAdjBps: number;
    mevBps: number;
    staleBps: number;
    routeGuardBps: number;
    blendedPreClamp: number;
    reasons: string[];
  };
}

// -------------------------- Math helpers --------------------------

const ONE_E18 = 1_000_000_000_000_000_000n;
const BPS = 10_000;

// micro-cache for 10^n to avoid repeated loops
const POW10: Record<number, bigint> = { 0: 1n };
function pow10(n: number): bigint {
  if (n < 0 || n > 36) throw new Error("pow10 out of range");
  if (POW10[n] !== undefined) return POW10[n];
  let r = 1n;
  for (let i = 0; i < n; i++) r *= 10n;
  POW10[n] = r;
  return r;
}

// outPerIn scaled by 1e18 (fixed-point bigint):
// (outRaw / 10^outDec) / (inRaw / 10^inDec) = (outRaw * 10^inDec * 1e18) / (inRaw * 10^outDec)
function outPerIn1e18(outRaw: bigint, inRaw: bigint, outDec: number, inDec: number): bigint {
  if (inRaw === 0n) return 0n;
  const num = outRaw * pow10(inDec) * ONE_E18;
  const den = inRaw * pow10(outDec);
  return den === 0n ? 0n : num / den;
}

// Bounded conversion for analytics (ratios only). Returns 0 if non-finite.
function toNumberFrom1e18(x: bigint): number {
  const n = Number(x); // may overflow but stays finite for practical ranges
  const v = n / 1e18;
  return Number.isFinite(v) && !Number.isNaN(v) ? v : 0;
}

function clampBps(x: number, lo = 0, hi = 5000): number {
  const v = Number.isFinite(x) && !Number.isNaN(x) ? x : 0;
  return Math.max(lo, Math.min(hi, Math.round(v)));
}

function minOutFromBps(outRaw: bigint, slippageBps: number): bigint {
  const s = BigInt(clampBps(slippageBps));
  return (outRaw * BigInt(BPS) - outRaw * s) / BigInt(BPS);
}

// ---------------------- Signal estimators -------------------------

// Dual-probe impact & slope (bps).
function estimateImpactAndSlopeBps(i: DynSlipInputs): { impactBps: number; slopeBps: number } {
  const rm1e18 = outPerIn1e18(i.outRaw, i.amountInRaw, i.outDecimals, i.inDecimals);
  if (rm1e18 === 0n || !i.probe5 || !i.probe10) return { impactBps: 0, slopeBps: 0 };

  const r5  = outPerIn1e18(i.probe5.outRaw,  i.probe5.amountInRaw,  i.outDecimals, i.inDecimals);
  const r10 = outPerIn1e18(i.probe10.outRaw, i.probe10.amountInRaw, i.outDecimals, i.inDecimals);
  if (r5 === 0n || r10 === 0n) return { impactBps: 0, slopeBps: 0 };

  const rm  = toNumberFrom1e18(rm1e18);
  const r5n = toNumberFrom1e18(r5);
  const r10n= toNumberFrom1e18(r10);
  if (rm <= 0 || r5n <= 0 || r10n <= 0) return { impactBps: 0, slopeBps: 0 };

  const impact5  = Math.max(0, (rm - r5n)  / rm);
  const impact10 = Math.max(0, (rm - r10n) / rm);

  const impactBps = clampBps(Math.max(impact5, impact10) * BPS, 0, 5000);
  const slopePerPct = (impact10 - impact5) / 0.05; // per 5% size delta
  const slopeBps    = clampBps(Math.max(0, slopePerPct), 0, 3000);

  return { impactBps, slopeBps };
}

// Rolling micro-volatility in bps (gentle nudge; capped)
function estimateVolatilityBps(recentRates1e18?: bigint[]): number {
  if (!recentRates1e18 || recentRates1e18.length < 6) return 0;
  const xs = recentRates1e18.map(toNumberFrom1e18).filter((v) => v > 0);
  if (xs.length < 6) return 0;

  const n = xs.length;
  const mean = xs.reduce((a, b) => a + b, 0) / n;
  let variance = 0;
  for (let i = 0; i < n; i++) {
    const d = xs[i] - mean;
    variance += d * d;
  }
  variance /= (n - 1);
  const sigma = Math.sqrt(variance);
  const rawBps = sigma * BPS;
  const nudged = rawBps * 0.6;
  return clampBps(nudged, 0, 200);
}

// Confidence-calibrated buffer from log-returns (95% default)
function sigmaBpsFromLogReturns(recentRates1e18?: bigint[]): number {
  if (!recentRates1e18 || recentRates1e18.length < 8) return 0;
  const xs = recentRates1e18.map(toNumberFrom1e18).filter((v) => v > 0);
  if (xs.length < 8) return 0;

  const rets: number[] = [];
  for (let i = 1; i < xs.length; i++) {
    const prev = xs[i - 1], curr = xs[i];
    const r = Math.log(curr / prev);
    if (Number.isFinite(r)) rets.push(r);
  }
  if (rets.length < 6) return 0;

  const n = rets.length;
  const mean = rets.reduce((a,b)=>a+b,0) / n;
  let varr = 0;
  for (let i = 0; i < n; i++) {
    const d = rets[i] - mean;
    varr += d * d;
  }
  varr /= (n - 1);
  const sigma = Math.sqrt(varr);
  const sigmaBps = sigma * 10_000;
  return clampBps(sigmaBps, 0, 300);
}

function kForConfidence(conf?: number): number {
  if (!conf || conf <= 0.9)  return 1.2816; // ~90%
  if (conf <= 0.95)          return 1.6449; // ~95%
  if (conf <= 0.975)         return 1.96;   // ~97.5%
  if (conf <= 0.99)          return 2.3263; // ~99%
  return 2.5758;                           // ~99.5%
}

// Native-denominated gas/size heuristic (pure bigint).
// Applies only if tokenIn or tokenOut is native → values trade in wei.
// Thresholds: >2% → +40 bps; >1% → +20 bps; >0.5% → +10 bps.
function gasTradeAdjustmentBps(i: DynSlipInputs): number {
  if (!i.gasPriceWei || !i.estGasUnits || i.estGasUnits <= 0) return 0;

  const nativeDec = i.nativeDecimals ?? 18;
  const gasCostWei = i.gasPriceWei * BigInt(i.estGasUnits);

  let tradeWei: bigint | null = null;
  if (i.isNativeIn && i.inDecimals === nativeDec) {
    tradeWei = i.amountInRaw;
  } else if (i.isNativeOut && i.outDecimals === nativeDec) {
    tradeWei = i.outRaw;
  }
  if (!tradeWei || tradeWei <= 0n) return 0;

  const gasRatioBps = (gasCostWei * 10_000n) / tradeWei; // bigint bps
  if (gasRatioBps > 200n) return 40;
  if (gasRatioBps > 100n) return 20;
  if (gasRatioBps >  50n) return 10;
  return 0;
}

// ------------------------ Main estimator --------------------------

export function computeDynamicSlippage(i: DynSlipInputs): DynSlipResult {
  // Policy defaults & clamps
  const hardCap = clampBps(i.hardCapBps ?? 5000, 0, 5000);
  const floor   = clampBps(i.minFloorBps ?? 5, 0, hardCap);
  const userCap = clampBps(i.userMaxSlippageBps ?? hardCap, floor, hardCap);
  const userMin = clampBps(i.userMinSlippageBps ?? 0, 0, userCap);

  // Signals
  const { impactBps, slopeBps } = estimateImpactAndSlopeBps(i);
  const volBps  = estimateVolatilityBps(i.recentRates1e18);
  const gasBps  = gasTradeAdjustmentBps(i);

  // Stale & MEV buffers
  const staleLimit = i.staleQuoteMs ?? 15_000;
  const isStale = !!i.quoteAgeMs && i.quoteAgeMs > staleLimit;
  const staleBps = isStale ? (i.staleQuoteBps ?? 10) : 0;
  const mevBps   = i.mevBufferBps ?? 10;

  // Confidence buffer (95% default)
  const sigmaBps = sigmaBpsFromLogReturns(i.recentRates1e18);
  const k        = kForConfidence(i.confidenceLevel ?? 0.95);
  const confBps  = clampBps(sigmaBps * k * 0.6, 0, 400); // dampened & capped

  // Route-change guard
  const routeGuardBps = i.routeChanged ? (i.routeChangeBps ?? 15) : 0;

  // Blend (purely data-driven)
  const blended =
    floor
    + Math.round(impactBps * 0.9)
    + Math.round(slopeBps  * 0.4)
    + Math.round(volBps    * 0.6)
    + gasBps
    + staleBps
    + mevBps
    + Math.round(confBps)
    + routeGuardBps;

  // Clamp to user/hard bounds, enforce userMin/floor
  const preClamp = blended;
  const cappedByUser = Math.min(blended, userCap);
  const finalBps = clampBps(Math.max(userMin, Math.max(floor, cappedByUser)), 0, hardCap);

  return {
    slippageBps: finalBps,
    minOut: minOutFromBps(i.outRaw, finalBps),
    debug: {
      floorBps: floor,
      capBps: hardCap,
      userCapBps: userCap,
      priceImpactBps: impactBps,
      impactSlopeBps: slopeBps,
      volBps,
      confBps,
      gasAdjBps: gasBps,
      mevBps,
      staleBps,
      routeGuardBps,
      blendedPreClamp: preClamp,
      reasons: buildReasons({ impactBps, slopeBps, volBps, confBps, gasBps, staleBps, mevBps, routeGuardBps }),
    },
  };
}

function buildReasons(s: {
  impactBps: number; slopeBps: number; volBps: number; confBps: number;
  gasBps: number; staleBps: number; mevBps: number; routeGuardBps: number;
}): string[] {
  const r: string[] = [];
  if (s.impactBps     > 0) r.push(`price-impact ${s.impactBps}bps`);
  if (s.slopeBps      > 0) r.push(`impact-slope ${s.slopeBps}bps`);
  if (s.volBps        > 0) r.push(`volatility ${s.volBps}bps`);
  if (s.confBps       > 0) r.push(`confidence ${s.confBps}bps`);
  if (s.gasBps        > 0) r.push(`gas/size ${s.gasBps}bps`);
  if (s.staleBps      > 0) r.push(`stale-quote ${s.staleBps}bps`);
  if (s.mevBps        > 0) r.push(`mev-buffer ${s.mevBps}bps`);
  if (s.routeGuardBps > 0) r.push(`route-change ${s.routeGuardBps}bps`);
  return r;
}

// ----------------- Optional: rolling buffer helper ----------------

export class RollingRates1e18 {
  private buf: bigint[] = [];
  private max: number;

  constructor(max = 40) { this.max = Math.max(8, max); } // need >=8 for log-return sigma

  push(x1e18: bigint) {
    this.buf.push(x1e18);
    if (this.buf.length > this.max) this.buf.shift();
  }

  values(): bigint[] { return this.buf.slice(); }
}

// ----------------- Optional: route fingerprint helper -------------

export function makeRouteKey(parts: Array<string | undefined | null>): string {
  return parts.filter(Boolean).map(s => String(s).toLowerCase()).join(">");
}

