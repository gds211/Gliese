// rpc-gateway/src/reads_budget_do.ts
export class ReadsBudgetDO {
  private tokens = 0;
  private last = Date.now();

  constructor(private state: DurableObjectState, private env: Env) {}

  async fetch(req: Request) {
    const url = new URL(req.url);
    if (url.pathname !== "/take") return new Response("not found", { status: 404 });

    const needed = Number(url.searchParams.get("n") ?? "1");
    const limit = Number(this.env.GLOBAL_READS_RPS ?? "500");
    const now = Date.now();

    // refill at RPS, cap burst at 2x
    const elapsed = (now - this.last) / 1000;
    this.tokens = Math.min(limit * 2, this.tokens + elapsed * limit);
    this.last = now;

    if (this.tokens >= needed) {
      this.tokens -= needed;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json" }
      });
    }
    const retryMs = Math.ceil(((needed - this.tokens) / limit) * 1000);
    return new Response(JSON.stringify({ ok: false, retryMs }), {
      status: 429,
      headers: {
        "content-type": "application/json",
        "retry-after": String(Math.ceil(retryMs / 1000))
      }
    });
  }
}

