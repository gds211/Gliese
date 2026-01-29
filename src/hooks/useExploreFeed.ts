// src/hooks/useExploreFeed.ts
import { useQuery } from "@tanstack/react-query";

export type ExploreMode = "new_trending" | "top_traded";
export type ExploreTimeframe = "15m" | "1h" | "4h" | "24h";
export type ExploreChain = string;

export type ExploreToken = {
  tokenAddress: string;
  tokenSymbol: string;
  tokenName?: string;
  tokenLogo?: string;
  chainId?: string;
  usdPrice?: number | null;
  marketCap?: number | null;
  totalLiquidityUsd?: number | null;
  totalHolders?: number | null;
  securityScore?: number | null;
  tokenAge?: number | null;
  // Metrics that can be numbers or objects depending on Moralis response
  volumeUsd?: number | Record<string, number> | null;
  usdPricePercentChange?: number | Record<string, number> | null;
  netBuyers?: number | Record<string, number> | null;
};

export type ExploreFeedResponse = {
  items: ExploreToken[];
  meta?: any;
};

function getSupabaseFunctionBaseUrl() {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!url) console.warn("Missing VITE_SUPABASE_URL env var");
  return url ? url.replace(/\/$/, "") : "";
}

function getAnonKey() {
  return (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "";
}

export function useExploreFeed(params: {
  chain: ExploreChain;
  timeframe: ExploreTimeframe;
  mode: ExploreMode;
  limit?: number;
  force?: boolean;
}) {
  const { chain, timeframe, mode, limit = 50, force = false } = params;

  return useQuery<ExploreFeedResponse>({
    queryKey: ["explore-feed", chain, timeframe, mode, limit, force ? 1 : 0],
    staleTime: 60_000, // Cache for 1 minute
    refetchOnWindowFocus: false,
    queryFn: async ({ signal }) => {
      const base = getSupabaseFunctionBaseUrl();
      const anon = getAnonKey();
      
      const qs = new URLSearchParams();
      qs.set("chain", chain);
      qs.set("timeframe", timeframe);
      qs.set("mode", mode);
      qs.set("limit", String(limit));
      if (force) qs.set("force", "1");

      const url = `${base}/functions/v1/explore-feed?${qs.toString()}`;

      const res = await fetch(url, {
        method: "GET",
        signal,
        headers: {
          "accept": "application/json",
          ...(anon ? { apikey: anon, authorization: `Bearer ${anon}` } : {}),
        },
      });

      if (!res.ok) {
        throw new Error(`Request failed: ${res.status}`);
      }

      const json = await res.json();
      return { items: Array.isArray(json.items) ? json.items : [], meta: json };
    },
  });
}
