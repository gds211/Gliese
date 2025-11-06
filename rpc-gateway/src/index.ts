// rpc-gateway/src/index.ts
import { Hono } from "hono";
import { sha256 } from "hono/utils/crypto";

// ---- typed bindings passed into Hono's generic ----
type Env = {
  UPSTREAM_RPC: string;
  GLOBAL_READS_RPS: string;
  BATCH_WAIT_MS: string;
  MAX_BATCH_SIZE: string;
  CACHE_TTL_MS: string;
  READS_LOCAL_LIMIT: any;             // Rate Limiting binding
  ReadsBudget: DurableObjectNamespace; // Durable Object (global limiter)
};

const app = new Hono<{ Bindings: Env }>();

// coalesce identical inflight requests
const inflight = new Map<string, Promise<Response>>();

function isReadMethod(method: string) {
  // treat all eth_* except sendRawTransaction as reads
  return method?.startsWith("eth_") && method !== "eth_sendRawTransaction";
}

// convert POST body → GET cache key (hash the body)
async function cacheKeyForBody(req: Request) {
  const body = await req.clone().text();
  const hash = await sha256(body);
  const url = new URL(req.url);
  const cacheUrl = new URL(url.origin + "/rpc-cache" + url.pathname + "?h=" + hash + "&p=" + url.search);
  return { body, key: new Request(cacheUrl.toString(), { method: "GET" }) };
}

async function takeFromGlobal(env: Env, n = 1) {
  const id = env.ReadsBudget.idFromName("global-reads");
  const stub = env.ReadsBudget.get(id);
  const r = await stub.fetch("https://do/take?n=" + n);
  if (r.ok) return true;
  if (r.status === 429) throw r;
  return false;
}

app.post("/rpc", async c => {
  const { UPSTREAM_RPC } = c.env;

  // Per‑POP soft limiter (Workers binding)
  const { success } = await c.env.READS_LOCAL_LIMIT.limit({ key: "reads" }); // docs show .limit({key}) usage
  if (!success) return c.text("Too Many Requests (local)", 429);

  // Count reads in this payload
  const raw = await c.req.raw.clone().text();
  const asArray = raw.trim().startsWith("[");
  const payload = JSON.parse(raw);
  const readCount = (asArray ? payload : [payload]).filter((r: any) => isReadMethod(r.method)).length;

  // Global limiter (DO)
  if (readCount > 0) await takeFromGlobal(c.env, readCount);

  // Cache POST by hashing body → GET cache key
  const { key } = await cacheKeyForBody(c.req.raw);
  const cache = caches.default;
  const cached = await cache.match(key);
  if (cached) return cached;

  // Coalesce identical inflight requests
  const coalesceKey = await sha256(raw);
  if (inflight.has(coalesceKey)) return (await inflight.get(coalesceKey)!.then(r => r.clone()));

  const p = (async () => {
    // Small batch wait window to catch microbursts
    await new Promise(r => setTimeout(r, Number(c.env.BATCH_WAIT_MS || "15")));

    const rsp = await fetch(UPSTREAM_RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: raw,
    });

    if (rsp.ok) {
      const clone = rsp.clone();
      const resp = new Response(clone.body, clone);
      // short TTL; downstream caches can also honor this
      const maxAge = Number(c.env.CACHE_TTL_MS || "1000");
      resp.headers.set("cache-control", `public, max-age=${Math.ceil(maxAge / 1000)}`);
      c.executionCtx.waitUntil(cache.put(key, resp.clone()));
      return resp;
    }
    return rsp;
  })();

  inflight.set(coalesceKey, p);
  try { return await p; } finally { inflight.delete(coalesceKey); }
});

// Re‑export the DO so Wrangler can bind it by class_name
export { ReadsBudgetDO } from "./reads_budget_do";

export default app;

