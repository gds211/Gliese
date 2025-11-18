// src/hooks/useNetworkFees.ts
import { useEffect, useMemo, useRef, useState } from "react";
import { usePublicClient } from "wagmi";
import { onNewBlock } from "@/lib/sharedBlockWatcher";
import { PUBLIC_CONFIG } from "@/config/public";
import { usePageVisible } from "@/hooks/usePageVisible";

type FeeState = {
  type: "eip1559" | "legacy" | "fallback";
  gasPriceWei?: bigint;
  maxFeePerGasWei?: bigint;
  maxPriorityFeePerGasWei?: bigint;
  baseFeePerGasWei?: bigint;
  effectiveGasPriceWei: bigint;
  lastUpdated: number;
  source: "estimateFeesPerGas" | "getGasPrice" | "fallback";
};

export function useNetworkFees(refreshMs = (PUBLIC_CONFIG as any).FEE_REFRESH_MS ?? 1000) {
  const client = usePublicClient();
  const isVisible = usePageVisible();
  const [fees, setFees] = useState<FeeState>(() => ({
    type: "fallback",
    effectiveGasPriceWei: (PUBLIC_CONFIG as any).GAS_PRICE_WEI_FALLBACK ?? 60_000_000_000n,
    lastUpdated: Date.now(),
    source: "fallback",
  }));
  const lastSetRef = useRef<FeeState>(fees);

  useEffect(() => {
    if (!client) return;
    let dead = false;
    let dirty = true;
    let lastFetchAt = 0;

    async function load() {
      if (dead) return;
      try {
        // Prefer EIP-1559 if available
        const e: any = await (client as any).estimateFeesPerGas?.();
        if (dead) return;
        if (e && (e.maxFeePerGas ?? e.maxPriorityFeePerGas)) {
          const next: FeeState = {
            type: "eip1559",
            maxFeePerGasWei: e.maxFeePerGas ?? undefined,
            maxPriorityFeePerGasWei: e.maxPriorityFeePerGas ?? undefined,
            effectiveGasPriceWei: e.maxFeePerGas ?? e.maxPriorityFeePerGas ?? lastSetRef.current.effectiveGasPriceWei,
            lastUpdated: Date.now(),
            source: "estimateFeesPerGas",
          };
          const prev = lastSetRef.current;
          const threshBps = BigInt((PUBLIC_CONFIG as any).UPDATE_THRESHOLD_BPS ?? 1n);
          const prevP = prev?.effectiveGasPriceWei ?? 0n;
          const delta = next.effectiveGasPriceWei > prevP ? next.effectiveGasPriceWei - prevP : prevP - next.effectiveGasPriceWei;
          const shouldSet = prevP === 0n || delta * 10_000n >= prevP * threshBps;
          if (shouldSet && !dead) {
            lastSetRef.current = next;
            setFees(next);
          }
          return;
        }
      } catch {
        // fall back to legacy
      }

      try {
        const gp: bigint = await (client as any).getGasPrice();
        if (dead) return;
        const next: FeeState = {
          type: "legacy",
          gasPriceWei: gp,
          effectiveGasPriceWei: gp,
          lastUpdated: Date.now(),
          source: "getGasPrice",
        };
        const prev = lastSetRef.current;
        const threshBps = BigInt((PUBLIC_CONFIG as any).UPDATE_THRESHOLD_BPS ?? 1n);
        const prevP = prev?.effectiveGasPriceWei ?? 0n;
        const delta = next.effectiveGasPriceWei > prevP ? next.effectiveGasPriceWei - prevP : prevP - next.effectiveGasPriceWei;
        const shouldSet = prevP === 0n || delta * 10_000n >= prevP * threshBps;
        if (shouldSet && !dead) {
          lastSetRef.current = next;
          setFees(next);
        }
      } catch {
        // keep previous (fallback already set)
      }
    }

    // First load immediately
    load();
    lastFetchAt = Date.now();

    // Poll at most every `refreshMs`, coalescing new blocks, and pause when hidden
    const tick = setInterval(() => {
      if (dead) return;
      if (!isVisible) return;
      const now = Date.now();
      if (now - lastFetchAt < Number(refreshMs)) return;
      if (!dirty) return;
      dirty = false;
      lastFetchAt = now;
      load();
    }, Math.max(300, Number(refreshMs)));

    // Mark dirty on every new block (coalesced by the interval)
    const off = onNewBlock(client as any, () => { dirty = true; });

    return () => { dead = true; off?.(); clearInterval(tick); };
  }, [client, isVisible, refreshMs]);

  return useMemo(() => fees, [fees]);
}

export default useNetworkFees;
