// src/hooks/useQuoteToStable.ts
import { useCallback, useEffect, useRef, useState } from "react";
import type { Address } from "viem";
import { parseUnits, formatUnits } from "viem";
import { usePublicClient } from "wagmi";
import { YAK_ROUTER_ABI } from "@/abi/yakRouter";
import { PUBLIC_CONFIG } from "@/config/public";
import { getDecimals } from "@/lib/decimals";
import { changedByAtLeastBps } from "@/lib/math";
import { useNetworkFees } from "@/hooks/useNetworkFees";

type CacheEntry = {
  decToken: number;
  decStable: number;
  per1TokenOut: bigint; // stable units received for 1.0 token
  at: number;           // ms epoch
  inflight?: Promise<void>;
};

const ZERO = "0x0000000000000000000000000000000000000000";

const toQuoteAddress = (addr?: string | null): Address => {
  if (!addr || addr === ZERO || addr.toUpperCase?.() === PUBLIC_CONFIG.NATIVE_SYMBOL) {
    return PUBLIC_CONFIG.WRAPPED_NATIVE as Address;
  }
  return addr as Address;
};

export function useQuoteToStable(params: {
  router: Address;
  tokenA?: string | null;
  tokenB?: string | null;
}) {
  const { router, tokenA, tokenB } = params;
  const client = usePublicClient();
  const stable = PUBLIC_CONFIG.STABLE_TOKEN as Address;

  // gas price (prefer EIP-1559 effective, fallback to config)
  const { effectiveGasPriceWei } = useNetworkFees(PUBLIC_CONFIG.FEE_REFRESH_MS);
  const gas = effectiveGasPriceWei ?? PUBLIC_CONFIG.GAS_PRICE_WEI_FALLBACK;

  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const [, forceRerender] = useState(0);

  const chainId = (client as any)?.chain?.id ?? PUBLIC_CONFIG.CHAIN_ID ?? 0;
  const keyFor = (tokenAddr: Address) =>
    `${chainId}:${tokenAddr.toLowerCase()}:${stable.toLowerCase()}`;

  const ensure = useCallback(
    async (addr?: string | null) => {
      if (!client || !addr) return;
      const tokenQ = toQuoteAddress(addr);
      const k = keyFor(tokenQ);
      const now = Date.now();
      const ttl = PUBLIC_CONFIG.QUOTE_TO_STABLE_TTL_MS ?? 25_000;

      let entry = cacheRef.current.get(k);
      if (entry?.inflight) return entry.inflight;
      if (entry && now - entry.at < ttl) return;

      const run = (async () => {
        const [dTok, dSt] = await Promise.all([
          getDecimals(client, tokenQ),
          getDecimals(client, stable),
        ]);

        let per1: bigint;
        if (tokenQ.toLowerCase() === stable.toLowerCase()) {
          // 1 stable = 1 USD
          per1 = 10n ** BigInt(dSt);
        } else {
          const one = 10n ** BigInt(dTok);
          let res: any = null;
          try {
            res = await client.readContract({
              abi: YAK_ROUTER_ABI,
              address: router,
              functionName: "findBestPathWithGas",
              args: [one, tokenQ, stable, BigInt(PUBLIC_CONFIG.MAX_STEPS ?? 3), gas],
            });
          } catch {
            // leave res as null; we'll treat as 0
          }
          const amounts: readonly bigint[] | undefined = res?.amounts as any;
          per1 = amounts && amounts.length
            ? BigInt(amounts[amounts.length - 1] as any)
            : 0n;
        }

        const prev = entry?.per1TokenOut;
        const threshold = BigInt(PUBLIC_CONFIG.UPDATE_THRESHOLD_BPS ?? 10n);
        const meaningful = prev === undefined
          ? true
          : changedByAtLeastBps(prev, per1, threshold);

        if (meaningful) {
          cacheRef.current.set(k, {
            decToken: dTok,
            decStable: dSt,
            per1TokenOut: per1,
            at: now,
          });
          forceRerender((x) => x + 1);
        } else {
          // refresh time only
          if (entry) entry.at = now;
        }
      })().finally(() => {
        const latest = cacheRef.current.get(k);
        if (latest) latest.inflight = undefined;
      });

      cacheRef.current.set(k, {
        ...(entry ?? ({} as CacheEntry)),
        inflight: run,
        at: now,
        decToken: entry?.decToken ?? 18,
        decStable: entry?.decStable ?? (PUBLIC_CONFIG.STABLE_DECIMALS ?? 6),
        per1TokenOut: entry?.per1TokenOut ?? 0n,
      });

      return run;
    },
    [client, router, stable, chainId, gas]
  );

  // prefetch & periodic refresh (tokens in view only)
  useEffect(() => {
    (async () => {
      await Promise.all([ensure(tokenA), ensure(tokenB)]);
    })();
    const id = setInterval(() => {
      ensure(tokenA);
      ensure(tokenB);
    }, PUBLIC_CONFIG.QUOTE_TO_STABLE_TTL_MS ?? 25_000);
    return () => clearInterval(id);
  }, [ensure, tokenA, tokenB]);

  // compute USD string for a human amount
  const toUsd = useCallback(
    (addr?: string | null, human?: string | null) => {
      if (!client || !addr || !human) return { value: null as number | null, text: "—", ready: false };
      const k = keyFor(toQuoteAddress(addr));
      const entry = cacheRef.current.get(k);
      if (!entry) return { value: null, text: "—", ready: false };

      try {
        const amtIn = parseUnits(human || "0", entry.decToken);
        const usdUnits = (amtIn * entry.per1TokenOut) / (10n ** BigInt(entry.decToken));
        const usd = Number(formatUnits(usdUnits, entry.decStable));
        const nf = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
        return { value: usd, text: "~" + nf.format(usd), ready: true };
      } catch {
        return { value: null, text: "—", ready: false };
      }
    },
    [client]
  );

  const toUsdText = useCallback(
    (addr?: string | null, human?: string | null) => toUsd(addr, human).text,
    [toUsd]
  );

  return { toUsd, toUsdText };
}

