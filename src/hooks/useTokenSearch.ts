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

const normalize = (s?: string) =>
  (s ?? "")
    .normalize("NFKD")
    // strip diacritics
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

const fold = (s?: string) => normalize(s).replace(/[^a-z0-9]/g, "");

const is0x = (s?: string) => !!s && /^0x[0-9a-f]{4,}$/i.test(s);

export type SearchedToken = {
  symbol: string;
  name?: string;
  address?: Address;
  logoURI?: string;
  source: "dexscreener" | "geckoterminal" | "address";
};

function geckoNetworkSlug(chainId?: number | null) {
  if (chainId === 143) return "monad";         // mainnet (when indexed)
  if (chainId === 10143) return "monad-testnet";
  return null;
}

// Small in‑memory cache for ERC‑20 metadata so we don’t keep re‑hitting the RPC
const erc20MetaCache = new Map<string, { symbol?: string; name?: string }>();

const LETTERS_NUMBERS_RE = /^[a-zA-Z0-9]+$/;

export function useTokenSearch(rawQuery: string, limit: number = 20) {
  const client = usePublicClient();
  const chainId = Number(PUBLIC_CONFIG.CHAIN_ID || 0);

  const query = useMemo(() => rawQuery.trim(), [rawQuery]);
  const enabled = useMemo(() => query.length > 0, [query]);

  return useQuery<SearchedToken[]>({
    queryKey: ["token-search", chainId, query, limit],
    enabled,
    staleTime: 60_000,           // 1 minute cache per browser
    gcTime: 5 * 60_000,          // keep in memory for 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: 1,                    // do not hammer the API on errors
    keepPreviousData: true,
    queryFn: async () => {
      const q = query;
      if (!q) return [];

      const looksLikeAddress = isAddress(q as `0x${string}`);
      const folded = fold(q);
      const normalized = normalize(q);
      const onlyLettersAndNumbers = LETTERS_NUMBERS_RE.test(q);
      const minLenForRemote = 2;

      const lower = q.toLowerCase();
      const nameMatches = (sym?: unknown, nm?: unknown) => {
        const s = String(sym ?? "").toLowerCase();
        const n = String(nm ?? "").toLowerCase();
        return s.includes(lower) || n.includes(lower);
      };

      // 1. Direct 0x address → read metadata from RPC (no 3rd‑party API).
      if (looksLikeAddress) {
        const key = q.toLowerCase();
        const cached = erc20MetaCache.get(key);
        if (cached) {
          return [
            {
              symbol: cached.symbol ?? "ERC20",
              name: cached.name,
              address: q as Address,
              source: "address",
            },
          ];
        }

        try {
          const [symbolResult, nameResult] = await Promise.all([
            client
              .readContract({
                address: q as Address,
                abi: ERC20_META_ABI,
                functionName: "symbol",
              })
              .catch(() => undefined),
            client
              .readContract({
                address: q as Address,
                abi: ERC20_META_ABI,
                functionName: "name",
              })
              .catch(() => undefined),
          ]);

          const symbol = typeof symbolResult === "string" ? symbolResult : undefined;
          const name = typeof nameResult === "string" ? nameResult : undefined;

          erc20MetaCache.set(key, { symbol, name });

          return [
            {
              symbol: symbol ?? "ERC20",
              name,
              address: q as Address,
              source: "address",
            },
          ];
        } catch {
          erc20MetaCache.set(key, { symbol: "ERC20" });
          return [
            {
              symbol: "ERC20",
              address: q as Address,
              source: "address",
            },
          ];
        }
      }

      // 2. Guard: do NOT hit remote APIs for very short, non‑address queries.
      //    Short searches are satisfied by local tokenlist filtering.
      if (onlyLettersAndNumbers && folded.length < minLenForRemote) {
        return [];
      }

      const raw = q;
      const fq = folded;

      const score = (t: { symbol?: string; name?: string; address?: Address }) => {
        const sym = t.symbol ?? "";
        const nm = t.name ?? "";
        const addr = (t.address ?? "").toLowerCase();

        const symU = sym.toUpperCase();
        const symF = fold(sym);
        const nameF = fold(nm);

        let s = 0;

        // Address‑like queries (but we already filtered pure addresses above)
        if (is0x(raw)) {
          if (addr === raw.toLowerCase()) s += 10_000;
          if (addr && addr.includes(raw.toLowerCase())) s += 9_000;
        }

        // Exact symbol / name
        if (symU === raw.toUpperCase()) s += 8_000;
        if (normalize(nm) === normalized) s += 7_600;

        // Prefix matches
        if (symF.startsWith(fq)) s += 6_000;
        if (nameF.startsWith(fq)) s += 5_200;

        // Substring matches
        if (symF.includes(fq)) s += 4_000;
        if (nameF.includes(fq)) s += 3_500;

        // Small penalty for obvious wrapped tokens when searching base
        if (/^w/i.test(sym) && symF.replace(/^w/i, "") === fq) s -= 500;

        return s;
      };

      // 3. Network‑specific search via GeckoTerminal when supported
      const monadSlug = geckoNetworkSlug(chainId);
      if (monadSlug) {
        try {
          const url =
            `https://api.geckoterminal.com/api/v2/search/pools` +
            `?query=${encodeURIComponent(q)}` +
            `&network=${encodeURIComponent(monadSlug)}` +
            `&include=base_token,quote_token`;

          const res = await fetch(url, { headers: { accept: "application/json" } });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          const json: any = await res.json();

          const included = new Map<string, any>();
          for (const inc of Array.isArray(json?.included) ? json.included : []) {
            if (inc?.type === "token" && inc?.id && inc?.attributes?.address) {
              included.set(String(inc.id), inc.attributes);
            }
          }

          const out: SearchedToken[] = [];
          const seen = new Set<string>();

          const pushAttr = (attr?: any) => {
            const addr: string | undefined = attr?.address;
            if (!addr || addr.length !== 42 || !addr.startsWith("0x")) return;
            const key = addr.toLowerCase();
            if (seen.has(key)) return;

            // For letter / ticker searches require a symbol or name match, not only address.
            if (onlyLettersAndNumbers && !is0x(raw) && !nameMatches(attr?.symbol, attr?.name)) {
              return;
            }

            seen.add(key);
            out.push({
              symbol: String(attr?.symbol || ""),
              name: typeof attr?.name === "string" ? attr.name : undefined,
              address: addr as Address,
              source: "geckoterminal",
            });
          };

          for (const pool of Array.isArray(json?.data) ? json.data : []) {
            const baseId = pool?.relationships?.base_token?.data?.id;
            const quoteId = pool?.relationships?.quote_token?.data?.id;
            pushAttr(included.get(baseId));
            pushAttr(included.get(quoteId));
            if (out.length >= limit) break;
          }

          out.sort((a, b) => score(b) - score(a));
          return out.slice(0, limit);
        } catch {
          // If GeckoTerminal is unavailable we fall through to DexScreener.
        }
      }

      // 4. Fallback: multi‑chain search via DexScreener (filtered to our chain when possible)
      try {
        const url = `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(q)}`;
        const res = await fetch(url, { headers: { accept: "application/json" } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json: any = await res.json();
        const pairs: any[] = Array.isArray(json?.pairs) ? json.pairs : [];

        const out: SearchedToken[] = [];
        const seen = new Set<string>();

        for (const p of pairs) {
          const pChainId: number | undefined =
            typeof p?.chainId === "number"
              ? p.chainId
              : typeof p?.chainId === "string" && /^\d+$/.test(p.chainId)
              ? Number(p.chainId)
              : undefined;

          const pushTk = (tk?: any) => {
            const addr: string | undefined = tk?.address;
            if (!addr || addr.length !== 42 || !addr.startsWith("0x")) return;

            // Keep only current chain if DexScreener provides chain id
            if (!Number.isNaN(chainId) && pChainId !== undefined && pChainId !== chainId) {
              return;
            }

            const key = addr.toLowerCase();
            if (seen.has(key)) return;

            // For letter / ticker searches require symbol or name match.
            if (onlyLettersAndNumbers && !is0x(raw) && !nameMatches(tk?.symbol, tk?.name)) {
              return;
            }

            seen.add(key);
            out.push({
              symbol: String(tk?.symbol || ""),
              name: typeof tk?.name === "string" ? tk.name : undefined,
              address: addr as Address,
              logoURI: tk?.iconUrl ?? tk?.imageUrl ?? undefined,
              source: "dexscreener",
            });
          };

          pushTk(p?.baseToken);
          pushTk(p?.quoteToken);
          if (out.length >= limit) break;
        }

        return out.slice(0, limit);
      } catch {
        return [];
      }
    },
  });
}
