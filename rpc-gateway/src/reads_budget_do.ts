// rpc-gateway/src/reads_budget_do.ts

interface Env {
  GLOBAL_READS_RPS: string; // tokens per second
}

export class ReadsBudgetDO {
  private tokens = 0;
  private last = Date.now();

  constructor(private state: DurableObjectState, private env: Env) {}

  async fetch(req: Request) {
    const url = new URL(req.url);
    if (url.pathname !== "/reads/take") {
      return new Response("not found", { status: 404 });
    }
    const needed = Number(url.searchParams.get("n") ?? "1");
    const limit = Math.max(1, Number(this.env.GLOBAL_READS_RPS ?? "500")); // tokens/sec
    const now = Date.now();

    // Refill tokens at RPS; cap burst at 2x
    const elapsedSec = Math.max(0, (now - this.last) / 1000);
    this.tokens = Math.min(this.tokens + elapsedSec * limit, limit * 2);
    this.last = now;

    if (this.tokens >= needed) {
      this.tokens -= needed;
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { "content-type": "application/json" }
      });
    }

    const retryMs = Math.ceil(((needed - this.tokens) / limit) * 1000);
    return new Response(JSON.stringify({ ok: false, retryMs }), {
      status: 429,
      headers: {
        "content-type": "application/json",
        "retry-after": String(Math.ceil(retryMs / 1000)),
      }
    });
  }
}

