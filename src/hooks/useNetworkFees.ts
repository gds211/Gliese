// src/hooks/useNetworkFees.ts
import { useEffect, useMemo, useState } from "react";
import { usePublicClient } from "wagmi";

type FeeState = {
  type: "eip1559" | "legacy" | "fallback";
  gasPriceWei?: bigint;                 // legacy
  maxFeePerGasWei?: bigint;             // EIP-1559
  maxPriorityFeePerGasWei?: bigint;     // EIP-1559
  baseFeePerGasWei?: bigint;            // EIP-1559 (from latest block)
  effectiveGasPriceWei: bigint;         // what we’ll pass to Yak for costing
  lastUpdated: number;                  // ms epoch
  source: "estimateFeesPerGas" | "getGasPrice" | "fallback";
};

export function useNetworkFees(refreshMs: number = 1500) {
  const client = usePublicClient();
  const [fees, setFees] = useState<FeeState>({
    type: "fallback",
    effectiveGasPriceWei: 1_000_000_000n, // 1 gwei fallback
    lastUpdated: Date.now(),
    source: "fallback",
  });

  useEffect(() => {
    if (!client) return;
    let dead = false;
    let timer: any;

    async function load() {
      try {
        // Try EIP-1559 first
        if ((client as any).estimateFeesPerGas) {
          const est = await (client as any).estimateFeesPerGas();
          // est has: maxFeePerGas, maxPriorityFeePerGas (and maybe baseFeePerGas on some clients)
          const latest = await client.getBlock();
          const base = latest.baseFeePerGas ?? undefined;

          const next: FeeState = {
            type: "eip1559",
            maxFeePerGasWei: est.maxFeePerGas,
            maxPriorityFeePerGasWei: est.maxPriorityFeePerGas,
            baseFeePerGasWei: base,
            effectiveGasPriceWei: est.maxFeePerGas ?? est.maxPriorityFeePerGas ?? 0n,
            lastUpdated: Date.now(),
            source: "estimateFeesPerGas",
          };
          if (!dead) setFees(next);
          return;
        }

        // Legacy gas price
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
            effectiveGasPriceWei: 1_000_000_000n,
            lastUpdated: Date.now(),
            source: "fallback",
          });
        }
      }
    }

    load();
    timer = setInterval(load, refreshMs);
    return () => { dead = true; clearInterval(timer); };
  }, [client, refreshMs]);

  return useMemo(() => fees, [fees]);
}
