/// <reference lib="deno.ns" />

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

type TimeframeUI = "15m" | "1h" | "4h" | "24h";
type ModeUI = "top-traded" | "new-trending";
type ExploreToken = {
  chain: string;
  tokenAddress: string;
  name: string;
  symbol: string;
  logo?: string | null;
  usdPrice: number | null;
  volumeUsd?: number | null;
  liquidityUsd?: number | null;
  marketCap?: number | null;
  priceChangePct?: number | null;
  securityScore?: number | null;
  tokenAgeDays?: number | null;
  possibleSpam?: boolean | null;
  verifiedContract?: boolean | null;
};

const corsHeaders: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "GET,POST,OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders },
  });
}

function clampInt(value: string | null, fallback: number, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function normalizeChain(input: string | null): string {
  const c = (input ?? "monad").toLowerCase().trim();
  const allowed = new Set([
    "monad", "eth", "base", "arbitrum", "polygon", "optimism",
    "avalanche", "binance", "solana", "ronin", "linea", "fantom",
    "pulse", "lisk", "sei"
  ]);
  return allowed.has(c) ? c : "monad";
}

function toMoralisTimeframe(tf: TimeframeUI): string {
  switch (tf) {
    case "15m": return "tenMinutes";
    case "1h": return "oneHour";
    case "4h": return "fourHours";
    case "24h": return "oneDay";
  }
}

function toMoralisEvmPriceChain(chain: string): string {
  if (chain === "binance") return "bsc";
  return chain;
}

function lower(s: string) {
  return s.toLowerCase();
}

function pickNumber(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : null;
}

async function safeJson(resp: Response) {
  const text = await resp.text();
  try { return JSON.parse(text); } catch { return null; }
}

async function fetchEvmUsdPrices(params: { moralisApiKey: string; chain: string; addresses: string[]; }): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const dedup = Array.from(new Set(params.addresses.map(lower))).slice(0, 100);
  if (dedup.length === 0) return out;

  const url = `https://deep-index.moralis.io/api/v2.2/erc20/prices?chain=${encodeURIComponent(params.chain)}`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "accept": "application/json", "content-type": "application/json", "X-API-Key": params.moralisApiKey },
    body: JSON.stringify({ tokens: dedup.map((a) => ({ token_address: a })) }),
  });

  if (!resp.ok) return out;
  const data = await safeJson(resp);
  if (!Array.isArray(data)) return out;

  for (const row of data) {
    const addr = (row?.tokenAddress ?? row?.token_address ?? row?.address);
    const price = row?.usdPrice ?? row?.usd_price;
    if (typeof addr === "string") {
      const p = pickNumber(price);
      if (p !== null) out.set(lower(addr), p);
    }
  }
  return out;
}

async function fetchSolanaUsdPrices(params: { moralisApiKey: string; addresses: string[]; }): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  const dedup = Array.from(new Set(params.addresses.map((a) => a.trim()))).slice(0, 100);
  if (dedup.length === 0) return out;

  const resp = await fetch("https://solana-gateway.moralis.io/token/mainnet/prices", {
    method: "POST",
    headers: { "accept": "application/json", "content-type": "application/json", "X-API-Key": params.moralisApiKey },
    body: JSON.stringify({ addresses: dedup }),
  });

  if (resp.ok) {
    const data = await safeJson(resp);
    const arr = Array.isArray(data) ? data : Array.isArray(data?.result) ? data.result : Array.isArray(data?.prices) ? data.prices : null;
    if (arr) {
      for (const row of arr) {
        const addr = row?.tokenAddress ?? row?.address ?? row?.token_address;
        const price = row?.usdPrice ?? row?.usd_price;
        if (typeof addr === "string") {
          const p = pickNumber(price);
          if (p !== null) out.set(addr, p);
        }
      }
      if (out.size > 0) return out;
    }
  }

  const concurrency = 10;
  let idx = 0;
  async function worker() {
    while (idx < dedup.length) {
      const current = dedup[idx++];
      try {
        const r = await fetch(
          `https://solana-gateway.moralis.io/token/mainnet/${encodeURIComponent(current)}/price`,
          { headers: { "accept": "application/json", "X-API-Key": params.moralisApiKey } },
        );
        if (!r.ok) continue;
        const d = await safeJson(r);
        const p = pickNumber(d?.usdPrice ?? d?.usd_price);
        if (p !== null) out.set(current, p);
      } catch { }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return out;
}

function extractTokensFromMoralis(moralisResponse: any, chain: string): ExploreToken[] {
  const resultArray = Array.isArray(moralisResponse?.result) ? moralisResponse.result : Array.isArray(moralisResponse) ? moralisResponse : [];
  const tokens: ExploreToken[] = [];
  for (const row of resultArray) {
    const md = row?.metadata ?? row?.token ?? row ?? {};
    const tokenAddress = md?.tokenAddress ?? md?.address ?? row?.tokenAddress ?? row?.address;
    if (typeof tokenAddress !== "string" || tokenAddress.length < 10) continue;

    const securityScore = pickNumber(md?.security?.securityScore ?? md?.securityScore ?? row?.securityScore);
    const possibleSpam = (md?.possibleSpam ?? row?.possibleSpam) === true || (md?.possibleSpam ?? row?.possibleSpam) === "true";

    tokens.push({
      chain,
      tokenAddress,
      name: String(md?.name ?? row?.name ?? ""),
      symbol: String(md?.symbol ?? row?.symbol ?? ""),
      logo: (md?.logo ?? md?.tokenLogo ?? row?.logo ?? row?.tokenLogo ?? null),
      usdPrice: pickNumber(md?.usdPrice ?? row?.usdPrice) ?? null,
      volumeUsd: pickNumber(row?.volumeUsd ?? row?.volume_usd) ?? null,
      liquidityUsd: pickNumber(row?.totalLiquidityUsd ?? row?.liquidityUsd) ?? null,
      marketCap: pickNumber(row?.marketCap ?? row?.market_cap) ?? null,
      priceChangePct: pickNumber(row?.usdPricePercentChange ?? row?.usdPricePercentChange?.value) ?? null,
      securityScore: securityScore ?? null,
      tokenAgeDays: pickNumber(row?.tokenAge ?? row?.tokenAgeDays) ?? null,
      possibleSpam,
      verifiedContract: Boolean(md?.verifiedContract ?? row?.verifiedContract ?? false),
    });
  }
  return tokens;
}

function applyBasicScamFilters(tokens: ExploreToken[], mode: ModeUI): ExploreToken[] {
  return tokens.filter((t) => {
    if (t.possibleSpam) return false;
    if (mode === "new-trending" && t.securityScore !== null && t.securityScore < 50) return false;
    if (t.liquidityUsd !== null && t.liquidityUsd < 500) return false;
    return true;
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const chain = normalizeChain(url.searchParams.get("chain"));
    const timeframe = (url.searchParams.get("timeframe") ?? "24h") as TimeframeUI;
    const mode = (url.searchParams.get("mode") ?? "top-traded") as ModeUI;
    const limit = clampInt(url.searchParams.get("limit"), 50, 10, 100);
    const force = url.searchParams.get("force") === "1";

    const moralisApiKey = Deno.env.get("MORALIS_API_KEY");
    if (!moralisApiKey) return json({ error: "Missing MORALIS_API_KEY" }, 500);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceRole) return json({ error: "Missing SUPABASE keys" }, 500);

    const supabase = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false } });
    const cacheKey = `explore:v3:${chain}:${timeframe}:${mode}:${limit}`;

    if (!force) {
      const { data: cached, error: cacheErr } = await supabase.from("explore_cache").select("payload, expires_at").eq("cache_key", cacheKey).maybeSingle();
      if (!cacheErr && cached?.payload && cached?.expires_at) {
        const expiresAt = new Date(cached.expires_at).getTime();
        if (Number.isFinite(expiresAt) && expiresAt > Date.now()) return json(cached.payload);
      }
    }

    const moralisTimeFrame = toMoralisTimeframe(timeframe);
    const sortBy = mode === "top-traded" ? { metric: "volumeUsd", timeFrame: moralisTimeFrame, type: "DESC" } : { metric: "usdPricePercentChange", timeFrame: moralisTimeFrame, type: "DESC" };

    const requestBody = {
      chains: [chain],
      filters: [{ metric: "marketCap", gt: 0, lt: 5_000_000_000_000 }, { metric: "totalLiquidityUsd", gt: 500 }, { metric: "volumeUsd", timeFrame: moralisTimeFrame, gt: 1000 }],
      sortBy, limit,
    };

    const discoveryResp = await fetch("https://deep-index.moralis.io/api/v2.2/discovery/tokens", {
      method: "POST", headers: { "accept": "application/json", "content-type": "application/json", "X-API-Key": moralisApiKey },
      body: JSON.stringify(requestBody),
    });

    if (!discoveryResp.ok) return json({ error: "Moralis discovery failed", status: discoveryResp.status }, 502);

    const discoveryJson = await safeJson(discoveryResp);
    let items = extractTokensFromMoralis(discoveryJson, chain);
    items = applyBasicScamFilters(items, mode);

    const addresses = items.map((t) => t.tokenAddress);
    if (chain === "solana") {
      const priceMap = await fetchSolanaUsdPrices({ moralisApiKey, addresses });
      items = items.map((t) => ({ ...t, usdPrice: priceMap.get(t.tokenAddress) ?? t.usdPrice ?? null }));
    } else {
      const priceChain = toMoralisEvmPriceChain(chain);
      const priceMap = await fetchEvmUsdPrices({ moralisApiKey, chain: priceChain, addresses });
      items = items.map((t) => ({ ...t, usdPrice: priceMap.get(lower(t.tokenAddress)) ?? t.usdPrice ?? null }));
    }

    const ttlSeconds = timeframe === "15m" ? 20 : 30;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    const payload = { generatedAt: new Date().toISOString(), chain, timeframe, timeframeUsed: moralisTimeFrame, mode, count: items.length, items };

    await supabase.from("explore_cache").upsert({ cache_key: cacheKey, payload, expires_at: expiresAt }, { onConflict: "cache_key" });
    return json(payload);
  } catch (e) {
    return json({ error: "Unhandled error", message: e instanceof Error ? e.message : String(e) }, 500);
  }
});
