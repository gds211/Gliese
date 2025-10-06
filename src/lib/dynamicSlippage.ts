// src/lib/dynamicSlippage.ts
// Production-ready dynamic slippage estimator (Yak-compatible).
// • Uniswap-style auto bounds (configurable), plus price-impact, curvature, vol, trend, MEV, stale, gas/size.
// • Robust probe math: works whether probes are +/− sized vs the main quote (detects direction automatically).
// • All bigint math for on-chain-like determinism where possible; careful float use only for analytics.
// • Returns { slippageBps, minOut, debug } for transparent UX/debugging.

import type { Address } from "viem";

// ----------------------------- Types ------------------------------

export interface DynSlipInputs {
  // Main quote:
  amountInRaw: bigint;         // raw units of tokenIn
  outRaw: bigint;              // raw units of tokenOut
  inDecimals: number;
  outDecimals: number;

  // Optional dual probes (ideally +5% and +10% amountIn of the main quote, but we auto-detect):
  probe5?:  { amountInRaw: bigint; outRaw: bigint }; 
  probe10?: { amountInRaw: bigint; outRaw: bigint };

  // Environment signals:
  gasPriceWei?: bigint;        // native gas price (wei)
  estGasUnits?: number;        // estimated gas for the swap
  quoteAgeMs?: number;         // ms since main quote
  recentRates1e18?: bigint[];  // rolling outPerIn rates (1e18 fixed-point)

  // Confidence & route-change guards:
  confidenceLevel?: number;    // default 0.95
  routeChanged?: boolean;      
  routeChangeBps?: number;     // default +15 bps

  // Policy / caps (UI intent: userMax is a CAP, not a floor):
  userMaxSlippageBps?: number; // UI cap; if omitted defaults to autoUpperBps (or hardCap)
  userMinSlippageBps?: number; // optional UI floor (default 0)
  minFloorBps?: number;        // global soft floor (default 5 = 0.05%)
  mevBufferBps?: number;       // +bps for MEV window (default 10)
  staleQuoteMs?: number;       // threshold for stale quotes (default 15_000)
  staleQuoteBps?: number;      // +bps if stale (default 10)
  hardCapBps?: number;         // absolute clamp (default 5000 = 50%)

  // Auto bounds (inspired by Uniswap “Auto”):
  // See: Uniswap Wallet docs: 0.5%–5.5%, and literature noting dynamic default slippage replacing static 0.5%.
  autoLowerBps?: number;       // default 10  (0.10%)
  autoUpperBps?: number;       // default 550 (5.50%)

  // Native context for gas/size heuristic:
  isNativeIn?: boolean;
  isNativeOut?: boolean;
  nativeDecimals?: number;     // default 18

  // Optional latency context (to scale trend/vol window mildly):
  expectedInclusionMs?: number; // default 2000 (approx two blocks on fast L1/L2/Monad)

  // (Optional) token info for logging/UX – not used by estimator
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
    autoLowerBps: number;
    autoUpperBps: number;
    priceImpactBps: number;
    impactSlopeBps: number;
    volBps: number;
    confBps: number;
    trendBps: number;
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

const POW10: Record<number, bigint> = { 0: 1n };
function pow10(n: number): bigint {
  if (n < 0 || n > 36) throw new Error("pow10 out of range");
  if (POW10[n] !== undefined) return POW10[n];
  let r = 1n;
  for (let i = 0; i < n; i++) r *= 10n;
  POW10[n] = r;
  return r;
}

// outPerIn scaled by 1e18:
// (outRaw / 10^outDec) / (inRaw / 10^inDec) = (outRaw * 10^inDec * 1e18) / (inRaw * 10^outDec)
function outPerIn1e18(outRaw: bigint, inRaw: bigint, outDec: number, inDec: number): bigint {
  if (inRaw === 0n) return 0n;
  const num = outRaw * pow10(inDec) * ONE_E18;
  const den = inRaw * pow10(outDec);
  return den === 0n ? 0n : num / den;
}

// Convert 1e18 fixed-point bigint to Number safely for analytics.
function toNumberFrom1e18(x: bigint): number {
  const q = x / 1_000_000_000n;   // 1e9
  const n = Number(q) / 1e9;      // restore 1e18 scale
  return Number.isFinite(n) && !Number.isNaN(n) ? n : 0;
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

// Robust impact & slope in bps (handles probes that are ± sized vs main).
function estimateImpactAndSlopeBps(i: DynSlipInputs): { impactBps: number; slopeBps: number } {
  const rm1e18 = outPerIn1e18(i.outRaw, i.amountInRaw, i.outDecimals, i.inDecimals);
  if (rm1e18 === 0n || !i.probe5 || !i.probe10) return { impactBps: 0, slopeBps: 0 };

  const r5  = outPerIn1e18(i.probe5.outRaw,  i.probe5.amountInRaw,  i.outDecimals, i.inDecimals);
  const r10 = outPerIn1e18(i.probe10.outRaw, i.probe10.amountInRaw, i.outDecimals, i.inDecimals);
  if (r5 === 0n || r10 === 0n) return { impactBps: 0, slopeBps: 0 };

  const rm   = toNumberFrom1e18(rm1e18);
  const r5n  = toNumberFrom1e18(r5);
  const r10n = toNumberFrom1e18(r10);
  if (rm <= 0 || r5n <= 0 || r10n <= 0) return { impactBps: 0, slopeBps: 0 };

  // Detect actual size deltas (could be +5%/+10% OR −5%/−10%)
  const s5  = Number(i.probe5.amountInRaw  > 0n ? Number(i.probe5.amountInRaw)  / Number(i.amountInRaw) : 0);
  const s10 = Number(i.probe10.amountInRaw > 0n ? Number(i.probe10.amountInRaw) / Number(i.amountInRaw) : 0);
  if (!Number.isFinite(s5) || !Number.isFinite(s10) || s5 <= 0 || s10 <= 0) return { impactBps: 0, slopeBps: 0 };

  const d5  = s5  - 1; // +0.05 if probe is +5%; −0.05 if probe is −5%
  const d10 = s10 - 1;

  // We want adverse impact: when input size increases, outPerIn should drop (r decreases).
  // impact = max(0, (rm - rProbe) / rm) regardless of probe sign; if probe is smaller (d<0), this should be ~0.
  const imp5  = Math.max(0, (rm - r5n)  / rm);
  const imp10 = Math.max(0, (rm - r10n) / rm);

  // Base impact is the worse of the two.
  const impactBps = clampBps(Math.max(imp5, imp10) * BPS, 0, 5000);

  // Slope: change in impact per unit of size change. Use absolute spacing of size deltas.
  const denom = Math.max(1e-9, Math.abs(d10 - d5)); // avoid div-by-0 if probes are equal
  const slopeRatio = Math.max(0, (imp10 - imp5) / denom); // ratio per +1.0 (100%) size delta
  const slopeBps   = clampBps(slopeRatio * BPS, 0, 3000); // convert to bps

  return { impactBps, slopeBps };
}

// Rolling micro-volatility (stddev of outPerIn) – gentle nudge, capped.
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

// Confidence-calibrated sigma from log returns.
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
  return clampBps(sigma * BPS, 0, 300);
}

function kForConfidence(conf?: number): number {
  if (!conf || conf <= 0.9)  return 1.2816; // ~90%
  if (conf <= 0.95)          return 1.6449; // ~95%
  if (conf <= 0.975)         return 1.96;   // ~97.5%
  if (conf <= 0.99)          return 2.3263; // ~99%
  return 2.5758;                           // ~99.5%
}

// One-sided trend penalty (adverse drift only) from log returns.
function adverseTrendBps(recentRates1e18?: bigint[]): number {
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

  const mean = rets.reduce((a,b)=>a+b,0) / rets.length; // average drift
  // For a swap expecting a certain outPerIn, an average *negative* log return indicates the rate is worsening.
  const adverse = Math.max(0, -mean); // only penalize adverse drift
  // Scale gently: drift (in log units) to bps ≈ adverse * 10_000, dampened.
  const bps = adverse * BPS * 0.8;
  return clampBps(bps, 0, 250);
}

// Gas/size heuristic – now also considers small ERC20<>ERC20 trades (bounded).
function gasTradeAdjustmentBps(i: DynSlipInputs): number {
  if (!i.gasPriceWei || !i.estGasUnits || i.estGasUnits <= 0) return 0;

  const nativeDec = i.nativeDecimals ?? 18;
  const gasCostWei = i.gasPriceWei * BigInt(i.estGasUnits);

  // Try to express trade value in "native units" heuristically:
  // Best: direct if native in/out; fallback: assume 1 token unit ≈ 1 native unit only if decimals match (conservative).
  let tradeWei: bigint | null = null;
  if (i.isNativeIn && i.inDecimals === nativeDec) {
    tradeWei = i.amountInRaw;
  } else if (i.isNativeOut && i.outDecimals === nativeDec) {
    tradeWei = i.outRaw;
  } else if (i.inDecimals === nativeDec) {
    tradeWei = i.amountInRaw;
  } else if (i.outDecimals === nativeDec) {
    tradeWei = i.outRaw;
  }

  if (!tradeWei || tradeWei <= 0n) return 0;

  const gasRatioBps = (gasCostWei * 10_000n) / tradeWei; // bigint bps
  if (gasRatioBps > 300n) return 50;
  if (gasRatioBps > 200n) return 30;
  if (gasRatioBps > 100n) return 15;
  if (gasRatioBps >  50n) return 5;
  return 0;
}

// ------------------------ Main estimator --------------------------

export function computeDynamicSlippage(i: DynSlipInputs): DynSlipResult {
  // Policy defaults & clamps (Uniswap-style auto window)
  const hardCap   = clampBps(i.hardCapBps ?? 5000, 0, 5000);
  const floor     = clampBps(i.minFloorBps ?? 5, 0, hardCap);
  const autoLo    = clampBps(i.autoLowerBps ?? 10, floor, hardCap);   // ~0.10%
  const autoHi    = clampBps(i.autoUpperBps ?? 550, autoLo, hardCap); // ~5.50%
  const userCap   = clampBps(i.userMaxSlippageBps ?? autoHi, autoLo, hardCap);
  const userMin   = clampBps(i.userMinSlippageBps ?? 0, 0, userCap);

  // Signals
  const { impactBps, slopeBps } = estimateImpactAndSlopeBps(i);
  const volBps   = estimateVolatilityBps(i.recentRates1e18);
  const sigmaBps = sigmaBpsFromLogReturns(i.recentRates1e18);
  const trendBps = adverseTrendBps(i.recentRates1e18);
  const gasBps   = gasTradeAdjustmentBps(i);

  // Stale & MEV buffers
  const staleLimit = i.staleQuoteMs ?? 15_000;
  const isStale    = !!i.quoteAgeMs && i.quoteAgeMs > staleLimit;
  const staleBps   = isStale ? (i.staleQuoteBps ?? 10) : 0;
  const mevBps     = i.mevBufferBps ?? 10;

  // Confidence buffer (95% default) – dampened & exposure-aware
  const k         = kForConfidence(i.confidenceLevel ?? 0.95);
  const ttiMs     = Math.max(500, Math.min(10_000, (i.expectedInclusionMs ?? 2000) + (i.quoteAgeMs ?? 0)));
  const exposure  = Math.min(2.0, Math.sqrt(ttiMs / 1000)); // 0.5s→~0.7x, 4s→~2x (mild)
  const confBps   = clampBps(sigmaBps * k * 0.6 * exposure, 0, 450);

  // Route-change guard
  const routeGuardBps = i.routeChanged ? (i.routeChangeBps ?? 15) : 0;

  // Blend with sensible weights (empirically conservative)
  // Ensure at least impact is covered, then add curvature/vol/trend/gas/MEV/stale/conf/route.
  const blended =
    Math.max(floor, Math.min(autoHi, autoLo + Math.round(impactBps * 0.9)))
    + Math.round(slopeBps   * 0.5)
    + Math.round(volBps     * 0.6)
    + Math.round(trendBps   * 1.0)
    + gasBps
    + mevBps
    + staleBps
    + Math.round(confBps)
    + routeGuardBps;

  // Guardrail: never below (impact + part of sigma + MEV)
  const minSafe = clampBps(impactBps + Math.round(sigmaBps * 0.5) + mevBps, floor, hardCap);

  const preClamp     = Math.max(blended, minSafe);
  const withinAuto   = Math.max(autoLo, Math.min(preClamp, autoHi));
  const cappedByUser = Math.min(withinAuto, userCap);
  const finalBps     = clampBps(Math.max(userMin, Math.max(floor, cappedByUser)), 0, hardCap);

  return {
    slippageBps: finalBps,
    minOut: minOutFromBps(i.outRaw, finalBps),
    debug: {
      floorBps: floor,
      capBps: hardCap,
      userCapBps: userCap,
      autoLowerBps: autoLo,
      autoUpperBps: autoHi,
      priceImpactBps: impactBps,
      impactSlopeBps: slopeBps,
      volBps,
      confBps,
      trendBps,
      gasAdjBps: gasBps,
      mevBps,
      staleBps,
      routeGuardBps,
      blendedPreClamp: preClamp,
      reasons: buildReasons({ impactBps, slopeBps, volBps, confBps, trendBps, gasBps, staleBps, mevBps, routeGuardBps }),
    },
  };
}

function buildReasons(s: {
  impactBps: number; slopeBps: number; volBps: number; confBps: number; trendBps: number;
  gasBps: number; staleBps: number; mevBps: number; routeGuardBps: number;
}): string[] {
  const r: string[] = [];
  if (s.impactBps     > 0) r.push(`price-impact ${s.impactBps}bps`);
  if (s.slopeBps      > 0) r.push(`curvature ${s.slopeBps}bps`);
  if (s.volBps        > 0) r.push(`volatility ${s.volBps}bps`);
  if (s.trendBps      > 0) r.push(`adverse-trend ${s.trendBps}bps`);
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
  constructor(max = 48) { this.max = Math.max(12, max); } // need >=8 for log-return sigma; keep some memory

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
