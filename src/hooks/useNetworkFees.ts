// src/hooks/useNetworkFees.ts
import { useEffect, useMemo, useRef, useState } from "react";
import { usePublicClient } from "wagmi";
import { PUBLIC_CONFIG } from "@/config/public";

type FeeState = {
  type: "eip1559" | "legacy" | "fallback";
  gasPriceWei?: bigint;                 // legacy
  maxFeePerGasWei?: bigint;            // EIP-1559 (effective cap)
  maxPriorityFeePerGasWei?: bigint;    // EIP-1559 tip
  baseFeePerGasWei?: bigint;           // EIP-1559 base from latest block
  effectiveGasPriceWei: bigint;        // what we pass to Yak for costing
  lastUpdated: number;                 // ms epoch
  source: "estimateFeesPerGas" | "getGasPrice" | "fallback";
};

export function useNetworkFees(refreshMs = PUBLIC_CONFIG.FEE_REFRESH_MS) {
  const client = usePublicClient();
  const [fees, setFees] = useState<FeeState>(() => ({
    type: "fallback",
    effectiveGasPriceWei: PUBLIC_CONFIG.GAS_PRICE_WEI_FALLBACK,
    lastUpdated: Date.now(),
    source: "fallback",
  }));
  const lastMaxPrioRef = useRef<bigint>(0n);

  useEffect(() => {
    if (!client) return;
    let dead = false;
    let unwatch: undefined | (() => void);
    let blockCounter = 0;

    async function updateFromBlock(block: any) {
      if (dead) return;
      try {
        // EIP-1559 path if block includes base fee.
        if (block?.baseFeePerGas != null) {
          const base = BigInt(block.baseFeePerGas);
          let maxPrio = lastMaxPrioRef.current;

          // Refresh tip only every N blocks to avoid spamming RPC.
          blockCounter++;
          if (blockCounter % (PUBLIC_CONFIG.FEE_REFRESH_BLOCKS ?? 5) === 0) {
            const e = await (client as any).estimateFeesPerGas?.().catch(() => null);
            if (e?.maxPriorityFeePerGas != null) {
              maxPrio = BigInt(e.maxPriorityFeePerGas);
              lastMaxPrioRef.current = maxPrio;
            } else {
              const gp = await client.getGasPrice().catch(() => null);
              if (gp != null) {
                // Roughly estimate tip if we only have a legacy price; safe, conservative.
                maxPrio = BigInt(gp) / 3n;
                lastMaxPrioRef.current = maxPrio;
              }
            }
          }

          const effective = base + maxPrio;
          if (!dead) {
            setFees({
              type: "eip1559",
              baseFeePerGasWei: base,
              maxPriorityFeePerGasWei: maxPrio,
              maxFeePerGasWei: effective,
              effectiveGasPriceWei: effective,
              lastUpdated: Date.now(),
              source: "estimateFeesPerGas",
            });
          }
        } else {
          // Legacy path: single RPC.
          const gp = await client.getGasPrice();
          if (!dead) {
            setFees({
              type: "legacy",
              gasPriceWei: gp,
              effectiveGasPriceWei: gp,
              lastUpdated: Date.now(),
              source: "getGasPrice",
            });
          }
        }
      } catch {
        if (!dead) {
          setFees({
            type: "fallback",
            effectiveGasPriceWei: PUBLIC_CONFIG.GAS_PRICE_WEI_FALLBACK,
            lastUpdated: Date.now(),
            source: "fallback",
          });
        }
      }
    }

    // Prefer WS; falls back to periodic polling via pollingInterval if WS is not available.
    unwatch = (client as any).watchBlocks?.({
      onBlock: (b: any) => { void updateFromBlock(b); },
      pollingInterval: refreshMs,
    });

    // Seed once on mount.
    (async () => {
      try {
        const latest = await client.getBlock({ blockTag: "latest" }).catch(() => null as any);
        if (latest) await updateFromBlock(latest);
      } catch { /* no-op */ }
    })();

    return () => { dead = true; unwatch?.(); };
  }, [client, refreshMs]);

  return useMemo(() => fees, [fees]);
}
