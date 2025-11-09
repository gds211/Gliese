// src/hooks/useNetworkFees.ts
import { useEffect, useMemo, useState } from "react";
import { usePublicClient } from "wagmi";
import { PUBLIC_CONFIG } from "@/config/public";

type FeeState = {
  type: "eip1559" | "legacy" | "fallback";
  gasPriceWei?: bigint;                 // legacy
  maxFeePerGasWei?: bigint;            // EIP-1559
  maxPriorityFeePerGasWei?: bigint;    // EIP-1559
  baseFeePerGasWei?: bigint;           // EIP-1559 (from latest block)
  effectiveGasPriceWei: bigint;        // what we’ll pass to Yak for costing
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

  useEffect(() => {
    if (!client) return;
    let dead = false;
    

    async function load() {
      try {
        // Try EIP-1559 first
        const e = await (client as any).estimateFeesPerGas?.();
        if (e && (e.maxFeePerGas ?? e["maxFeePerGas"])) {
          const maxFee = BigInt(e.maxFeePerGas);
          const maxPrio = BigInt(e.maxPriorityFeePerGas ?? 0n);

          // Base fee from latest block (if available)
          const block = await client.getBlock({ blockTag: "latest" }).catch(() => null as any);
          const base = BigInt(block?.baseFeePerGas ?? 0n);

          // Effective = min(maxFeePerGas, baseFee + maxPriority)
          const effective = (base + maxPrio) > maxFee ? maxFee : (base + maxPrio);

          if (!dead) {
            setFees({
              type: "eip1559",
              maxFeePerGasWei: maxFee,
              maxPriorityFeePerGasWei: maxPrio,
              baseFeePerGasWei: base,
              effectiveGasPriceWei: effective,
              lastUpdated: Date.now(),
              source: "estimateFeesPerGas",
            });
          }
          return;
        }

        // Fallback to legacy getGasPrice
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

    load();
    const unwatch = client.watchBlockNumber({
      onBlockNumber: () => { if (!dead) load(); }
    });
    return () => { dead = true; unwatch?.(); };
  }, [client]);

  // Memo just in case a parent renders frequently
  return useMemo(() => fees, [fees]);
}

