// src/hooks/useTokenSearch.ts
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { isAddress, type Address } from "viem";
import { usePublicClient } from "wagmi";
import { PUBLIC_CONFIG } from "@/config/public";

const ERC20_META_ABI = [
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "name",   stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
] as const;

export type SearchedToken = {
  symbol: string;
  name?: string;
  address?: Address;
  logoURI?: string;
  source: "dexscreener" | "address";
};

/**
 * Token search that supports:
 *  - Direct contract address lookup (reads symbol/name on-chain)
 *  - Name/symbol search via DexScreener (pairs → base/quote tokens), filtered to current chain when possible
 * Results are deduped and limited (default 20). Uses React Query for caching.
 */
export function useTokenSearch(query: string, limit: number = 20) {
  const client = usePublicClient();
  const enabled = useMemo(() => query.trim().length > 0, [query]);

  return useQuery<SearchedToken[]>({
    queryKey: ["token-search", query, PUBLIC_CONFIG.CHAIN_ID],
    enabled,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      const q = query.trim();

      // If user typed an address, read symbol/name on-chain.
      if (q.startsWith("0x") && isAddress(q)) {
        try {
          const [symbol, name] = await Promise.all([
            client.readContract({ address: q as Address, abi: ERC20_META_ABI, functionName: "symbol" }) as Promise<string>,
            client.readContract({ address: q as Address, abi: ERC20_META_ABI, functionName: "name" })   as Promise<string>,
          ]);
          return [{ symbol, name, address: q as Address, source: "address" }];
        } catch {
          // Some tokens revert/behave oddly; still return a minimal entry.
          return [{ symbol: "ERC20", name: undefined, address: q as Address, source: "address" }];
        }
      }

      // Otherwise, use DexScreener for pair-backed tokens on DEXes.
      try {
        const url = `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(q)}`;
        const res = await fetch(url, { headers: { accept: "application/json" } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json: any = await res.json();
        const pairs: any[] = Array.isArray(json?.pairs) ? json.pairs : [];
        const out: SearchedToken[] = [];
        const seen = new Set<string>();
        const chainId = Number(PUBLIC_CONFIG.CHAIN_ID);

        for (const p of pairs) {
          // If the API reports chainId, keep only the current chain.
          const pChainId: number | undefined =
            typeof p?.chainId === "number" ? p.chainId :
            typeof p?.chainId === "string" && /^\d+$/.test(p.chainId) ? Number(p.chainId) :
            undefined;

          const pushToken = (tk?: any) => {
            const addr: string | undefined = typeof tk?.address === "string" ? tk.address : undefined;
            if (!addr || !addr.startsWith("0x") || addr.length !== 42) return;
            const key = addr.toLowerCase();
            if (seen.has(key)) return;

            if (pChainId !== undefined && pChainId !== chainId) return;

            seen.add(key);
            out.push({
              symbol: String(tk?.symbol || ""),
              name: typeof tk?.name === "string" ? tk.name : undefined,
              address: addr as Address,
              source: "dexscreener",
            });
          };

          pushToken(p?.baseToken);
          pushToken(p?.quoteToken);
          if (out.length >= limit) break;
        }

        return out.slice(0, limit);
      } catch {
        // Network/API outage etc. → just return no results (local list still works).
        return [];
      }
    },
  });
}

