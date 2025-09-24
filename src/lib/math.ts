// src/lib/math.ts
export function absBig(a: bigint) { return a >= 0n ? a : -a; }

// returns true if change >= thresholdBps (e.g., 10n = 0.1%)
export function changedByAtLeastBps(prev: bigint | null, next: bigint, thresholdBps: bigint) {
  if (prev === null) return true;
  if (prev === 0n) return next !== 0n;
  const diff = absBig(next - prev);
  // diff / prev >= thresholdBps / 10_000
  return diff * 10_000n >= prev * thresholdBps;
}
