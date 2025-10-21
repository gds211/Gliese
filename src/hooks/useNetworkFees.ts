// src/hooks/useNetworkFees.ts
import { useEffect, useMemo, useRef, useState } from "react";
import { usePublicClient } from "wagmi";
import { PUBLIC_CONFIG } from "@/config/public";

/**
 * Live network fee readings in WEI (bigint).
 * - Prefers EIP-1559 (estimateFeesPerGas) when available.
 * - Falls back to getGasPrice (legacy).
 * - Uses last-good value if the RPC returns 0/undefined.
 * - Never emits 0 → avoids UI/pathfinding glitches.
 */
export type FeeState = {
  type: "eip1559" | "legacy" | "fallback";
  gasPriceWei?: bigint;                 // legacy
  maxFeePerGasWei?: bigint;            // EIP-1559
  maxPriorityFeePerGasWei?: bigint;    // EIP-1559
  baseFeePerGasWei?: bigint;           // EIP-1559 (from latest block, if exposed)
  effectiveGasPriceWei: bigint;        // what you actually expect to pay per gas right now
  lastUpdated: number;                 // ms epoch
  source: "estimateFeesPerGas" | "getGasPrice" | "fallback";
};

const FALLBACK: bigint = PUBLIC_CONFIG.GAS_PRICE_WEI_FALLBACK ?? 1_000_000_000n; // 1 gwei floor

export function useNetworkFees(refreshMs: number = PUBLIC_CONFIG.FEE_REFRESH_MS): FeeState {
  const client = usePublicClient();
  const [fees, setFees] = useState<FeeState>(() => ({
    type: "fallback",
    effectiveGasPriceWei: FALLBACK,
    lastUpdated: Date.now(),
    source: "fallback",
  }));

  // keep last good value for resilience on transient RPC issues
  const lastGoodRef = useRef<FeeState>(fees);
  useEffect(() => { lastGoodRef.current = fees; }, [fees]);

  useEffect(() => {
    if (!client) return;
    let cancelled = false;
    let timer: any | undefined;
    let inFlight = false;

    async function tick() {
      if (inFlight) return;
      inFlight = true;
      try {
        // 1) Prefer EIP-1559: returns { maxFeePerGas, maxPriorityFeePerGas } on 1559 chains,
        //    or { gasPrice } on legacy. Both are handled below.
        // @ts-expect-error: public client attaches this action
        const efpg = await (client as any).estimateFeesPerGas?.().catch(() => null);

        // Best-effort latest block for baseFee (may be 0/undefined on some RPCs)
        const latestBlock: any = await client.getBlock({ blockTag: "latest" }).catch(() => null);
        const base: bigint = typeof latestBlock?.baseFeePerGas === "bigint" ? latestBlock.baseFeePerGas : 0n;

        // A) EIP-1559
        const maxFee = (efpg && typeof efpg.maxFeePerGas === "bigint") ? (efpg.maxFeePerGas as bigint) : undefined;
        const maxPrio = (efpg && typeof efpg.maxPriorityFeePerGas === "bigint") ? (efpg.maxPriorityFeePerGas as bigint) : undefined;

        if (maxFee !== undefined && maxPrio !== undefined) {
          const candidate = base > 0n ? base + maxPrio : maxFee;
          const effective = candidate > maxFee ? maxFee : candidate;

          const next: FeeState = {
            type: "eip1559",
            maxFeePerGasWei: maxFee,
            maxPriorityFeePerGasWei: maxPrio,
            baseFeePerGasWei: base > 0n ? base : undefined,
            effectiveGasPriceWei: (effective > 0n ? effective : (lastGoodRef.current?.effectiveGasPriceWei ?? FALLBACK)),
            lastUpdated: Date.now(),
            source: "estimateFeesPerGas",
          };
          if (!cancelled) setFees(next);
          return;
        }

        // B) Legacy (either efpg.gasPrice or getGasPrice)
        // @ts-expect-error
        const gp: bigint | null =
          typeof efpg?.gasPrice === "bigint"
            ? (efpg.gasPrice as bigint)
            // @ts-expect-error
            : await (client as any).getGasPrice?.().catch(() => null);

        if (typeof gp === "bigint" && gp > 0n) {
          const next: FeeState = {
            type: "legacy",
            gasPriceWei: gp,
            effectiveGasPriceWei: gp,
            lastUpdated: Date.now(),
            source: "getGasPrice",
          };
          if (!cancelled) setFees(next);
          return;
        }

        // C) Everything failed or returned bogus values → keep last good
        const last = lastGoodRef.current;
        if (!cancelled) {
          setFees({
            ...(last ?? { type: "fallback" as const }),
            effectiveGasPriceWei: (last?.effectiveGasPriceWei ?? FALLBACK),
            lastUpdated: Date.now(),
            source: "fallback",
          });
        }
      } finally {
        inFlight = false;
      }
    }

    // immediate read + interval (clamped to avoid thrash)
    tick();
    timer = setInterval(tick, Math.max(750, refreshMs || 0));
    return () => { cancelled = true; if (timer) clearInterval(timer); };
    // reset if chain changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, (client as any)?.chain?.id, refreshMs]);

  return useMemo(() => fees, [fees]);
}
