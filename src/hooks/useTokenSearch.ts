// src/hooks/useTokenSearch.ts
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { isAddress, type Address } from "viem";
import { usePublicClient } from "wagmi";
import { PUBLIC_CONFIG } from "@/config/public";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

// Minimal on‑chain metadata probe
const ERC20_META_ABI = [
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "name",   stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
] as const;

// Normalizers
const normalize = (s?: string) => (s ?? "")
  .normalize("NFKD")
  .replace(/\p{Diacritic}/gu, "")
  .toLowerCase();

const fold = (s?: string) => normalize(s).replace(/[^a-z0-9]/g, "");
const is0x = (s?: string) => !!s && /^0x[0-9a-f]{4,}$/i.test(s);

// Map dexscreener chain slugs to numeric chain ids so we can filter correctly.
const DEX_SLUG_TO_ID: Record<string, number> = {
  // EVM majors
  ethereum: 1, eth: 1,
  optimism: 10, op: 10,
  bsc: 56, bnb: 56,
  polygon: 137, matic: 137,
  avalanche: 43114, avax: 43114,
  arbitrum: 42161, arb: 42161,
  base: 8453,
  fantom: 250, ftm: 250,
  gnosis: 100, xdai: 100,
  // Your chain(s)
  monad: 143,
  "monad-testnet": 10143,
};

// GeckoTerminal network slug for your chain
function geckoNetworkSlug(chainId?: number | null) {
  if (chainId === 143) return "monad";
  if (chainId === 10143) return "monad-testnet";
  return null;
}

export type SearchedToken = {
  symbol: string;
  name?: string;
  address: Address;
  logoURI?: string;
  chainId?: number;
  source: "address" | "geckoterminal" | "dexscreener";
  // Optional relevance signals we can use for ranking
  liquidityUSD?: number;
  volume24hUSD?: number;
};

export function useTokenSearch(rawQuery: string, limit = 20) {
  const client  = usePublicClient();
  const chainId = Number(PUBLIC_CONFIG.CHAIN_ID);

  // Debounce to cut API spam and flicker
  const query = useDebouncedValue(rawQuery.trim(), 200);

  // Don’t search remotely for 1‑char inputs (except 0x…)
  const enabled = useMemo(() => {
    if (!query) return false;
    if (is0x(query)) return true;        // partial address ok
    return query.length >= 2;
  }, [query]);

  return useQuery<SearchedToken[]>({
    queryKey: ["token-search", chainId, query.toLowerCase()],
    enabled,
    keepPreviousData: true,
    staleTime: 60_000,
    gcTime: 15 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
    // IMPORTANT: use React Query's abort signal
    queryFn: async ({ signal }) => {
      const q = query;
      const lower = q.toLowerCase();
      const onlyLetters = !lower.startsWith("0x");

      const out: SearchedToken[] = [];
      const seen = new Set<string>();
      const push = (t?: Partial<SearchedToken>) => {
        if (!t?.address) return;
        const key = (t.address as string).toLowerCase();
        if (seen.has(key)) return;
        // If result is tagged with another chain, drop it
        if (typeof t.chainId === "number" && t.chainId !== chainId) return;

        // For purely alphabetic queries, require name/symbol match (not just address)
        if (onlyLetters) {
          const s = String(t.symbol || "").toLowerCase();
          const n = String(t.name   || "").toLowerCase();
          if (!s.includes(lower) && !n.includes(lower)) return;
        }

        seen.add(key);
        out.push({
          symbol: String(t.symbol || ""),
          name: typeof t.name === "string" ? t.name : undefined,
          address: t.address as Address,
          logoURI: t.logoURI,
          chainId: t.chainId,
          source: t.source as SearchedToken["source"],
          liquidityUSD: typeof t.liquidityUSD === "number" ? t.liquidityUSD : undefined,
          volume24hUSD: typeof t.volume24hUSD === "number" ? t.volume24hUSD : undefined,
        });
      };

      // 1) 0x… path: fetch on‑chain metadata; enrich with Dexscreener logos when possible
      if (isAddress(q as Address)) {
        try {
          const [symbol, name] = await Promise.all([
            client.readContract({ address: q as Address, abi: ERC20_META_ABI, functionName: "symbol" }) as Promise<string>,
            client.readContract({ address: q as Address, abi: ERC20_META_ABI, functionName: "name"   }) as Promise<string>,
          ]);
          push({ symbol, name, address: q as Address, chainId, source: "address" });
        } catch {
          push({ symbol: "ERC20", address: q as Address, chainId, source: "address" });
        }

        // Try to pull a logo + metrics from Dexscreener’s token endpoint
        try {
          const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${q}`, { signal, headers: { accept: "application/json" } });
          if (res.ok) {
            const js: any = await res.json();
            for (const p of js?.pairs ?? []) {
              const slug = String(p?.chainId || p?.chain || "").toLowerCase();
              const cid  = typeof p?.chainId === "number" ? p.chainId : DEX_SLUG_TO_ID[slug];
              // pick which side is "this" address
              const tk = (p?.baseToken?.address?.toLowerCase() === q.toLowerCase()) ? p?.baseToken : p?.quoteToken;
              push({
                symbol: tk?.symbol, name: tk?.name, address: (tk?.address || q) as Address,
                logoURI: tk?.iconUrl || tk?.imageUrl,
                chainId: cid,
                source: "dexscreener",
                liquidityUSD: Number(p?.liquidity?.usd) || undefined,
                volume24hUSD: Number(p?.volume?.h24) || undefined,
              });
            }
          }
        } catch { /* ignore */ }

        // Address search returns immediately
        return out.slice(0, limit);
      }

      // 2) Chain‑scoped text search via GeckoTerminal
      const slug = geckoNetworkSlug(chainId);
      if (slug) {
        try {
          const url =
            `https://api.geckoterminal.com/api/v2/search/pools` +
            `?query=${encodeURIComponent(q)}&network=${encodeURIComponent(slug)}&include=base_token,quote_token`;
          const res = await fetch(url, { signal, headers: { accept: "application/json" } });
          if (res.ok) {
            const json: any = await res.json();
            const included = new Map<string, any>();
            for (const inc of Array.isArray(json?.included) ? json.included : []) {
              if (inc?.type === "token" && inc?.id && inc?.attributes?.address) {
                included.set(String(inc.id), inc.attributes);
              }
            }
            const pushAttr = (attr?: any) => {
              const addr: string | undefined = attr?.address;
              if (!addr || addr.length !== 42 || !addr.startsWith("0x")) return;
              push({
                symbol: attr?.symbol, name: attr?.name, address: addr as Address,
                chainId, source: "geckoterminal",
              });
            };
            for (const pool of Array.isArray(json?.data) ? json.data : []) {
              pushAttr(included.get(pool?.relationships?.base_token?.data?.id));
              pushAttr(included.get(pool?.relationships?.quote_token?.data?.id));
              if (out.length >= Math.max(limit, 40)) break;
            }
          }
        } catch { /* ignore */ }
      }

      // 3) Fallback: Dexscreener search; KEEP ONLY results for our chain (using slug→id map)
      try {
        const url = `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(q)}`;
        const res = await fetch(url, { signal, headers: { accept: "application/json" } });
        if (res.ok) {
          const json: any = await res.json();
          for (const p of Array.isArray(json?.pairs) ? json.pairs : []) {
            const slug = String(p?.chainId || p?.chain || "").toLowerCase();
            const cid  = typeof p?.chainId === "number" ? p.chainId : DEX_SLUG_TO_ID[slug];
            // If Dexscreener can’t tell the chain, drop the pair to avoid cross‑chain noise.
            if (typeof cid === "number" && cid !== chainId) continue;
            const tokens = [p?.baseToken, p?.quoteToken];
            for (const tk of tokens) {
              push({
                symbol: tk?.symbol, name: tk?.name, address: tk?.address as Address,
                logoURI: tk?.iconUrl || tk?.imageUrl,
                chainId: cid,
                source: "dexscreener",
                liquidityUSD: Number(p?.liquidity?.usd) || undefined,
                volume24hUSD: Number(p?.volume?.h24) || undefined,
              });
            }
            if (out.length >= Math.max(limit, 40)) break;
          }
        }
      } catch { /* ignore */ }

      // 4) Rank by match quality + liquidity/volume as soft tie‑breakers
      const n = normalize(q); const f = fold(q);
      const score = (t: SearchedToken) => {
        const sU = (t.symbol || "").toUpperCase();
        const sF = fold(t.symbol);
        const nF = fold(t.name);
        let s = 0;
        if (sU === q.toUpperCase()) s += 8000;           // exact symbol
        if (normalize(t.name) === n) s += 7600;          // exact name
        if (sF.startsWith(f)) s += 6000;
        if (nF.startsWith(f)) s += 5200;
        if (sF.includes(f)) s += 4000;
        if (nF.includes(f)) s += 3500;
        // Soft popularity signals
        s += Math.min(2000, Math.log10((t.liquidityUSD || 0) + 1) * 400);
        s += Math.min(1000, Math.log10((t.volume24hUSD || 0) + 1) * 200);
        return s;
      };
      out.sort((a, b) => {
        const d = score(b) - score(a);
        if (d !== 0) return d;
        return `${a.symbol}|${a.address}`.localeCompare(`${b.symbol}|${b.address}`);
      });
      return out.slice(0, limit);
    },
  });
}
