import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { isAddress, type Address } from "viem";
import { usePublicClient } from "wagmi";
import { PUBLIC_CONFIG } from "@/config/public";

const ERC20_META_ABI = [
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "name",   stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
] as const;

const normalize = (s?: string) => (s ?? "")
  .normalize("NFKD")
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

export function useTokenSearch(query: string, limit: number = 20) {
  const client = usePublicClient();
  const chainId = Number(PUBLIC_CONFIG.CHAIN_ID);
  const enabled = useMemo(() => query.trim().length > 0, [query]);

  return useQuery<SearchedToken[]>({
    queryKey: ["token-search", query, chainId],
    enabled,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      const q = query.trim();


     const lower = q.toLowerCase();
     const onlyLetters = !lower.startsWith("0x");
     const validAddr = isAddress(q as `0x${string}`);

     const nameMatches = (sym?: any, nm?: any) => {
       const s = String(sym || "").toLowerCase();
       const n = String(nm || "").toLowerCase();
       return s.includes(lower) || n.includes(lower);
     };



            // 1) Direct 0x address → read metadata on the connected chain 
      if (q.startsWith("0x") && isAddress(q)) {
        try {
          const [symbolResult, nameResult] = await Promise.all([
            client.readContract({ address: q as Address, abi: ERC20_META_ABI, functionName: "symbol" }).catch(() => undefined),
            client.readContract({ address: q as Address, abi: ERC20_META_ABI, functionName: "name" }).catch(() => undefined),
          ]);
          const symbol = symbolResult as string | undefined;
          const name = nameResult as string | undefined;
          return [{ symbol, name, address: q as Address, source: "address" }];
        } catch {
          return [{ symbol: "ERC20", name: undefined, address: q as Address, source: "address" }];
        }
      }

      // 2) If current chain is Monad → use GeckoTerminal search on the Monad network.
      const monadSlug = geckoNetworkSlug(chainId);
      if (monadSlug) {
        try {
          // Public GeckoTerminal API. Search pools on a specific network and include token objects.
          // Docs confirm /search/pools with `network` + `include` (base_token, quote_token).
          // https://docs.coingecko.com/reference/search-pools
          const url =
            `https://api.geckoterminal.com/api/v2/search/pools` +
            `?query=${encodeURIComponent(q)}&network=${encodeURIComponent(monadSlug)}&include=base_token,quote_token`;

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

  // NEW: letter‑only searches must match by symbol or name, not address
  if (onlyLetters && !nameMatches(attr?.symbol, attr?.name)) return;

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

          const fq = fold(query.trim());
const raw = query.trim();
out.sort((a, b) => {
  const sa = score(a);
  const sb = score(b);
  return sb - sa;
});
return out.slice(0, limit);

function score(t: { symbol?: string; name?: string; address?: Address }) {
  const sym = t.symbol ?? "";
  const nm = t.name ?? "";
  const addr = (t.address ?? "").toLowerCase();

  const symU = sym.toUpperCase();
  const symF = fold(sym);
  const nameF = fold(nm);

  let s = 0;
  if (is0x(raw)) {
    if (addr === raw.toLowerCase()) s += 10000;
    if (addr.includes(raw.toLowerCase())) s += 9000;
  }
  if (symU === raw.toUpperCase()) s += 8000;
  if (normalize(nm) === normalize(raw)) s += 7600;
  if (symF.startsWith(fq)) s += 6000;
  if (nameF.startsWith(fq)) s += 5200;
  if (symF.includes(fq)) s += 4000;
  if (nameF.includes(fq)) s += 3500;
  // light penalty for obvious "wrapped" prefix when query matches base
  if (/^w/i.test(sym) && symF.replace(/^w/i, "") === fq) s -= 500;
  return s;
}
        } catch {
          // If GeckoTerminal is unreachable, fall through to DexScreener (may not return Monad hits).
        }
      }

      // 3) Fallback: multi‑chain name search via DexScreener (filters by chainId when provided by API)
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
            typeof p?.chainId === "number" ? p.chainId :
            typeof p?.chainId === "string" && /^\d+$/.test(p.chainId) ? Number(p.chainId) :
            undefined;

                const pushTk = (tk?: any) => {
  const addr: string | undefined = tk?.address;
  if (!addr || addr.length !== 42 || !addr.startsWith("0x")) return;
  if (pChainId !== undefined && pChainId !== chainId) return; // keep current chain if dex gives chainId
  const key = addr.toLowerCase();
  if (seen.has(key)) return;

  // NEW: letter‑only searches must match by symbol or name, not address
  if (onlyLetters && !nameMatches(tk?.symbol, tk?.name)) return;

  seen.add(key);
  out.push({
    symbol: String(tk?.symbol || ""),
    name: typeof tk?.name === "string" ? tk.name : undefined,
    address: addr as Address,
    logoURI: tk?.iconUrl ?? tk?.imageUrl, // NEW: carry logo URL through
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
