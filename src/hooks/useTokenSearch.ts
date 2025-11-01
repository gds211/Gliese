// src/hooks/useTokenSearch.ts
import { useQuery } from "@tanstack/react-query";
import { isAddress, type Address } from "viem";
import { PUBLIC_CONFIG } from "@/config/public";

// --- Types ---
export type SearchedToken = {
  symbol: string;
  name?: string;
  address?: Address;
  logoURI?: string;
  source?: "gecko" | "dexscreener" | "address";
};

// --- Helpers ---
const norm = (s = "") =>
  s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");

const startsWithNorm = (text = "", q = "") => norm(text).startsWith(norm(q));

const geckoNetworkSlug = (chainId: number) => {
  // Extend here if you add more chains.
  // Monad Testnet in your config:
  if (chainId === 10143) return "monad-testnet";
  // If you move to mainnet later, set proper slug (e.g. "monad").
  return null;
};

// --- Hook ---
export function useTokenSearch(query: string, opts?: { limit?: number }) {
  const limit = Math.min(Math.max(opts?.limit ?? 50, 1), 100);
  const chainId = PUBLIC_CONFIG.CHAIN_ID;

  return useQuery<SearchedToken[]>({
    queryKey: ["token-search", chainId, query, limit],
    enabled: Boolean(query && query.trim().length > 0),
    // Small caching helps with typeahead
    staleTime: 45_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,

    queryFn: async (): Promise<SearchedToken[]> => {
      const q = query.trim();

      // 1) If user pasted a 0x address, return the address itself.
      // (Explicit user intent—allowed even if not listed on a DEX.)
      if (q.startsWith("0x") && isAddress(q)) {
        // Optionally: attempt to read `symbol`/`name` via RPC here.
        return [{ symbol: "ERC20", address: q as Address, source: "address" }];
      }

      // 2) GeckoTerminal — scoped to Monad network, returns only tokens in pools (listed)
      const geckoSlug = geckoNetworkSlug(chainId);
      const out: SearchedToken[] = [];
      const seen = new Set<string>();
      const push = (t?: SearchedToken) => {
        if (!t) return;
        const key = t.address ? t.address.toLowerCase() : `symbol:${t.symbol.toUpperCase()}`;
        if (seen.has(key)) return;
        seen.add(key);
        out.push(t);
      };

      if (geckoSlug) {
        try {
          const url =
            `https://api.geckoterminal.com/api/v2/search/pools` +
            `?query=${encodeURIComponent(q)}` +
            `&network=${encodeURIComponent(geckoSlug)}` +
            `&take=${limit}` +
            `&include=base_token,quote_token`;
          const res = await fetch(url, { headers: { accept: "application/json" } });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json: any = await res.json();

          // `included` holds tokens; pool data references them by id.
          const included = new Map(
            (Array.isArray(json?.included) ? json.included : []).map((x: any) => [x?.id, x])
          );

          const toToken = (attr?: any): SearchedToken | undefined => {
            if (!attr) return;
            const symbol = String(attr?.attributes?.symbol ?? "").trim();
            const name   = String(attr?.attributes?.name ?? "").trim();
            const addr   = String(attr?.attributes?.address ?? "").toLowerCase();
            if (!symbol) return;
            return {
              symbol,
              name,
              address: addr && addr.startsWith("0x") ? (addr as Address) : undefined,
              logoURI: attr?.attributes?.image_url || undefined,
              source: "gecko",
            };
          };

          const pushAttr = (id?: string) => {
            const node = id ? included.get(id) : undefined;
            const tk = toToken(node);
            if (!tk) return;
            // **Prefix filter** only (symbol/name)
            if (startsWithNorm(tk.symbol, q) || startsWithNorm(tk.name ?? "", q)) {
              push(tk);
            }
          };

          for (const pool of Array.isArray(json?.data) ? json.data : []) {
            const baseId  = pool?.relationships?.base_token?.data?.id;
            const quoteId = pool?.relationships?.quote_token?.data?.id;
            pushAttr(baseId);
            pushAttr(quoteId);
            if (out.length >= limit) break;
          }
        } catch {
          // Fall through to DexScreener
        }
      }

      // 3) DexScreener fallback — also lists traded tokens (may be multi-chain)
      if (out.length < limit) {
        try {
          const url = `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(q)}`;
          const res = await fetch(url, { headers: { accept: "application/json" } });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json: any = await res.json();

          const pairs: any[] = Array.isArray(json?.pairs) ? json.pairs : [];
          for (const p of pairs) {
            const pushTk = (tk?: any) => {
              if (!tk || !tk.symbol) return;
              const s = String(tk.symbol);
              const n = String(tk.name ?? "");
              // **Prefix filter** only
              if (!(startsWithNorm(s, q) || startsWithNorm(n, q))) return;

              push({
                symbol: s,
                name: n || undefined,
                address: typeof tk.address === "string" && tk.address.startsWith("0x")
                  ? (tk.address as Address)
                  : undefined,
                source: "dexscreener",
              });
            };

            // Only interested in tokens, not pairs — take both sides
            pushTk(p?.baseToken);
            pushTk(p?.quoteToken);

            if (out.length >= limit) break;
          }
        } catch {
          // Ignore; return whatever we have
        }
      }

      // Simple deterministic ranking: exact symbol > exact name > prefix symbol > prefix name
      const score = (t: SearchedToken) => {
        const s = norm(t.symbol);
        const n = norm(t.name ?? "");
        const qn = norm(q);
        if (s === qn) return 0;
        if (n === qn) return 1;
        if (s.startsWith(qn)) return 2;
        if (n.startsWith(qn)) return 3;
        return 9;
      };

      return out.sort((a, b) => score(a) - score(b)).slice(0, limit);
    },
  });
}
