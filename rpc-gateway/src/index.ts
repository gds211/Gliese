// rpc-gateway/src/index.ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { sha256 } from "hono/utils/crypto";

type RateLimitBinding = {
  // cf Rate Limiting binding
  limit: (opts: { key: string }) => Promise<{ success: boolean }>;
};

type Env = {
  // Vars
  UPSTREAM_RPC: string;
  GLOBAL_READS_RPS: string;   // numeric string
  BATCH_WAIT_MS: string;      // numeric string (we keep simple: no server-side batching)
  MAX_BATCH_SIZE: string;     // numeric string
  CACHE_TTL_MS: string;       // numeric string
  ORIGIN_ALLOWLIST?: string;  // CSV of allowed origins

  // Bindings
  READS_LOCAL_LIMIT: RateLimitBinding;       // per-POP (cheap) limiter
  ReadsBudget: DurableObjectNamespace;       // global token bucket
};

const app = new Hono<{ Bindings: Env }>();

/** Utility: classify safe "read" RPC methods (never cache tx submit etc.) */
function isReadMethod(method: string) {
  if (!method) return false;
  if (!method.startsWith("eth_")) return false;
  // writes/mutations to avoid caching:
  const deny = new Set([
    "eth_sendRawTransaction",
    "eth_sendTransaction",
    "eth_submitWork",
    "eth_coinbase", // not mutating, but keep reads focused on block/chain state
    "eth_accounts", // wallet-specific
  ]);
  if (deny.has(method)) return false;
  // Many eth_* are reads (blockNumber, getBlockByNumber, call, getLogs, getBalance, etc.)
  return true;
}

/** Build a GET cache key URL for the POST body (hash to keep key short) */
async function cacheKeyForBody(req: Request) {
  const body = await req.clone().text();
  const hash = await sha256(body); // hex string
  const url = new URL(req.url);
  const keyUrl = new URL(url.origin + "/rpc?" + new URLSearchParams({ h: hash }).toString());
  return new Request(keyUrl.toString(), { method: "GET" });
}

/** Global coalescing map for identical in‑flight requests (per Worker isolate) */
const inflight = new Map<string, Promise<Response>>();

function parseOriginAllowlist(csv?: string) {
  return (csv ?? "").split(",").map(s => s.trim()).filter(Boolean);
}

/** CORS allowlist middleware (explicit origins only in production) */
app.use("*", async (c, next) => {
  const allow = parseOriginAllowlist(c.env.ORIGIN_ALLOWLIST);
  if (allow.length === 0) return next(); // default: let cors() below handle

  const origin = c.req.header("origin") || "";
  if (allow.includes(origin)) {
    c.header("Access-Control-Allow-Origin", origin);
    c.header("Vary", "Origin");
  }
  return next();
});

// Generic CORS (kept strict; origin set above when allowlisted)
app.use("/*", cors({
  origin: (origin, c) => {
    const allow = parseOriginAllowlist(c.env.ORIGIN_ALLOWLIST);
    if (allow.length === 0) return origin; // fallback permissive for dev
    return allow.includes(origin) ? origin : ""; // block non-allowlisted
  },
  allowHeaders: ["content-type", "x-api-key"],
  allowMethods: ["POST", "OPTIONS"],
  maxAge: 600,
}));

app.get("/healthz", (c) => c.json({ ok: true }));

app.options("/rpc", (c) => c.body(null, 204)); // preflight

app.post("/rpc", async (c) => {
  const { env, req } = c;

  // NOTE: we keep server-side "batching" off; wagmi already batches client-side.
  // We do coalescing + caching for reads, and global/local rate limiting.

  // Parse JSON (object or array)
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return c.json({ error: { code: -32700, message: "Parse error" } }, 400);
  }

  const isBatch = Array.isArray(payload);
  const methods: string[] = (isBatch ? payload : [payload]).map((x) => x?.method ?? "");

  // Determine if all calls are "reads" (if any write -> treat as write; no cache)
  const allReads = methods.length > 0 && methods.every(isReadMethod);

  // Per-POP (local) rate limit for reads
  if (allReads) {
    const key = methods.sort().join("|") || "rpc";
    const { success } = await env.READS_LOCAL_LIMIT.limit({ key });
    if (!success) {
      return c.json({ error: { code: 429, message: "Local rate limit exceeded" } }, 429);
    }
  }

  // Global rate budget (Durable Object) only for reads
  if (allReads) {
    const needed = isBatch ? Math.min(methods.length, Number(env.MAX_BATCH_SIZE || "250")) : 1;
    const id = env.ReadsBudget.idFromName("global");
    const stub = env.ReadsBudget.get(id);
    const budgetURL = new URL("https://do/reads/take");
    budgetURL.searchParams.set("n", String(needed));
    const rsp = await stub.fetch(budgetURL.toString());
    if (rsp.status === 429) {
      const { retryMs } = await rsp.json().catch(() => ({ retryMs: 1000 }));
      return c.json({ error: { code: 429, message: "Global budget exceeded", retryMs } }, 429, {
        headers: { "Retry-After": String(Math.ceil((retryMs ?? 1000) / 1000)) },
      });
    }
    // if 200 OK continue
  }

  // Coalesce identical POSTs (especially for reads)
  const bodyText = await req.clone().text();
  const coalesceKey = allReads ? await sha256(bodyText) : crypto.randomUUID();

  if (allReads && inflight.has(coalesceKey)) {
    return (await inflight.get(coalesceKey)!.then(r => r.clone()));
  }

  const promise = (async () => {
    // Cache lookup for reads
    if (allReads) {
      const cache = caches.default;
      const cacheReq = await cacheKeyForBody(req);
      const cached = await cache.match(cacheReq);
      if (cached) return cached;
    }

    // Forward upstream
    const upstream = env.UPSTREAM_RPC;
    const upstreamRsp = await fetch(upstream, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: bodyText,
      // optional: tune fetch cf caching headers via response; we prefer Cache API below
    });

    // If upstream failed hard, bubble up
    if (!upstreamRsp.ok) {
      // pass upstream body through (help debugging)
      const text = await upstreamRsp.text();
      return new Response(text, { status: upstreamRsp.status, headers: { "content-type": upstreamRsp.headers.get("content-type") || "text/plain" } });
    }

    // Cache successful read responses briefly
    if (allReads) {
      const ttlMs = Math.max(0, Number(env.CACHE_TTL_MS || "1000"));
      const resp = new Response(upstreamRsp.body, upstreamRsp); // stream through
      if (ttlMs > 0) {
        const cache = caches.default;
        const cacheReq = await cacheKeyForBody(req);
        // set explicit TTL headers to help downstream and for observability
        resp.headers.set("Cache-Control", `public, max-age=${Math.floor(ttlMs / 1000)}`);
        // put into cache but don't block the response
        c.executionCtx.waitUntil(cache.put(cacheReq, resp.clone()));
      }
      return resp;
    }

    return upstreamRsp;
  })();

  if (allReads) inflight.set(coalesceKey, promise);
  try {
    const out = await promise;
    return out;
  } finally {
    if (allReads) inflight.delete(coalesceKey);
  }
});

// Re-export the DO so Wrangler can bind it by class_name
export { ReadsBudgetDO } from "./reads_budget_do";

export default app;
