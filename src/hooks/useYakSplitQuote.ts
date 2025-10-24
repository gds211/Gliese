// src/hooks/useYakSplitQuote.ts
import { useEffect, useMemo, useRef, useState } from "react";
import type { Address } from "viem";
import { parseUnits } from "viem";
import { usePublicClient } from "wagmi";
import { PUBLIC_CONFIG } from "@/config/public";
import { YAK_ROUTER_ABI } from "@/abi/yakRouter";
import { ADAPTER_ABI } from "@/abi/adapter";
import { useNetworkFees } from "@/hooks/useNetworkFees";
import { getDecimals } from "@/lib/decimals";

// --- Types (kept shallow) ---
export type SplitLeg = {
  adapter: Address;
  amountInWei: bigint;
  quotedOutWei: bigint;
  gasUnits: bigint;
};
export type SplitPlan = {
  shouldSplit: boolean;
  netGainWei: bigint;
  netGainBps: bigint;
  legs: [SplitLeg, SplitLeg];
  reason?: string;
};

type Args = {
  router: Address;
  tokenIn: Address | string;
  tokenOut: Address | string;
  amountInHuman: string;
  enabled?: boolean;
  force?: boolean;
};

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";
const isNative = (v?: string) =>
  !v || v.toUpperCase() === PUBLIC_CONFIG.NATIVE_SYMBOL || v === ZERO_ADDR;

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

type AdapterMeta = { name?: string; gasUnits?: bigint };
const adapterMetaCache = new Map<string, AdapterMeta>();
const queryCache = new Map<string, bigint>(); // adapter|amountInWei|tokenIn|tokenOut

export function useYakSplitQuote({ router, tokenIn, tokenOut, amountInHuman, enabled = true, force = false }: Args) {
  const client = usePublicClient();
  const { effectiveGasPriceWei } = useNetworkFees(PUBLIC_CONFIG.FEE_REFRESH_MS);
  const gasPrice = effectiveGasPriceWei ?? PUBLIC_CONFIG.GAS_PRICE_WEI_FALLBACK;

  const [plan, setPlan] = useState<SplitPlan | null>(null);
  const lastAmountRef = useRef<string>("");
  const decRef = useRef<{ in?: number; out?: number }>({});

  // resolve decimals once (cached)
  useEffect(() => {
    let dead = false;
    (async () => {
      const [di, do_] = await Promise.all([
        getDecimals(tokenIn as Address, client),
        getDecimals(tokenOut as Address, client),
      ]);
      if (!dead) decRef.current = { in: di, out: do_ };
    })().catch(() => void 0);
    return () => { dead = true; };
  }, [tokenIn, tokenOut, client]);

  useEffect(() => {
    if (!client || !enabled) return;

    if (amountInHuman === lastAmountRef.current) return;
    lastAmountRef.current = amountInHuman;

    let cancelled = false;
    (async () => {
      try {
        const di = decRef.current.in ?? PUBLIC_CONFIG.NATIVE_DECIMALS;
        const amountInWei = parseUnits(amountInHuman || "0", di);
        if (amountInWei <= 0n) { if (!cancelled) setPlan(null); return; }

        if (!force && amountInWei < PUBLIC_CONFIG.SPLIT_TRADES.MIN_SIZE_WEI) {
          if (!cancelled) setPlan(null); return;
        }

        // 1) candidates
        const adapters = await getCandidateAdapters(client, router);
        if (!adapters.length) { if (!cancelled) setPlan(null); return; }

        const inAddr  = normalizeInput(tokenIn);
        const outAddr = normalizeOutput(tokenOut);

        // 2) top-2 by full-size direct quote
        const fullQuotes = await Promise.all(
          adapters.map(async (a) => ({
            adapter: a,
            out: await adapterQueryCached(client, a, amountInWei, inAddr, outAddr),
          }))
        );
        const top = fullQuotes.filter(q => q.out > 0n)
          .sort((a,b) => (a.out > b.out ? -1 : a.out < b.out ? 1 : 0))
          .slice(0, 2);
        if (top.length < 2) { if (!cancelled) setPlan(null); return; }

        // 3) coarse ratio grid
        const rCandidates = PUBLIC_CONFIG.SPLIT_TRADES.RATIO_CANDIDATES ?? [0.25, 0.5, 0.75];
        let best: { r: number; legs: [SplitLeg, SplitLeg]; netWei: bigint } | null = null;

        const metaA = await getAdapterMeta(client, top[0].adapter);
        const metaB = await getAdapterMeta(client, top[1].adapter);
        const overhead = BigInt(PUBLIC_CONFIG.SPLIT_TRADES.ROUTER_OVERHEAD_GAS ?? 30_000);

        for (const r0 of rCandidates) {
          const r = clamp(r0, 0.05, 0.95);
          const a0 = (amountInWei * BigInt(Math.floor(r * 10_000))) / 10_000n;
          const b0 = amountInWei - a0;

          const outA = await adapterQueryCached(client, top[0].adapter, a0, inAddr, outAddr);
          const outB = await adapterQueryCached(client, top[1].adapter, b0, inAddr, outAddr);

          const gasA = BigInt(metaA.gasUnits ?? 120_000n);
          const gasB = BigInt(metaB.gasUnits ?? 120_000n);
          const net = (outA + outB) - gasPrice * (gasA + gasB + 2n * overhead);

          if (!best || net > best.netWei) {
            best = {
              r,
              legs: [
                { adapter: top[0].adapter, amountInWei: a0, quotedOutWei: outA, gasUnits: gasA },
                { adapter: top[1].adapter, amountInWei: b0, quotedOutWei: outB, gasUnits: gasB },
              ],
              netWei: net,
            };
          }
        }

        if (!best) { if (!cancelled) setPlan(null); return; }

        // 4) baseline = best single adapter net (conservative; Yak's router path may do even better)
        const bestSingle = top[0];
        const singleGas = BigInt(metaA.gasUnits ?? 120_000n) + (PUBLIC_CONFIG.SPLIT_TRADES.ROUTER_OVERHEAD_GAS ?? 30_000);
        const baselineNet = bestSingle.out - gasPrice * BigInt(singleGas);

        const gainWei = best.netWei - baselineNet;
        const gainBps = baselineNet > 0n ? (gainWei * 10_000n) / baselineNet : 0n;

        const passes =
          gainWei > 0n &&
          (gainBps >= (PUBLIC_CONFIG.SPLIT_TRADES.MIN_IMPROVEMENT_BPS ?? 8n));

        const res: SplitPlan = {
          shouldSplit: !!passes,
          netGainWei: gainWei,
          netGainBps: gainBps,
          legs: best.legs,
          reason: passes ? "net improvement after gas" : "no material gain after gas",
        };
        if (!cancelled) setPlan(res);
      } catch (e) {
        console.error("useYakSplitQuote error", e);
        if (!cancelled) setPlan(null);
      }
    })();

    return () => { cancelled = true; };
  }, [client, router, tokenIn, tokenOut, amountInHuman, enabled, force, effectiveGasPriceWei]);

  return plan;
}

function normalizeInput(addr: string | Address): Address {
  return isNative(addr as string) ? (PUBLIC_CONFIG.WRAPPED_NATIVE as Address) : (addr as Address);
}
function normalizeOutput(addr: string | Address): Address {
  return isNative(addr as string) ? (PUBLIC_CONFIG.WRAPPED_NATIVE as Address) : (addr as Address);
}

async function getCandidateAdapters(client: any, router: Address): Promise<Address[]> {
  const curated = PUBLIC_CONFIG.SPLIT_TRADES.CANDIDATE_ADAPTERS as Address[] | undefined;
  if (curated && curated.length) return curated.slice(0, PUBLIC_CONFIG.SPLIT_TRADES.MAX_CANDIDATE_ADAPTERS ?? 6);

  const max = PUBLIC_CONFIG.SPLIT_TRADES.MAX_CANDIDATE_ADAPTERS ?? 6;
  const count = Number(await client.readContract({ address: router, abi: YAK_ROUTER_ABI, functionName: "adaptersCount" }).catch(() => 0n));
  const n = Math.min(max, Math.max(0, count));
  const ids = [...Array(n)].map((_, i) => BigInt(i));

  const adapters: Address[] = [];
  for (const i of ids) {
    const a = await client.readContract({ address: router, abi: YAK_ROUTER_ABI, functionName: "ADAPTERS", args: [i] }).catch(() => null);
    if (a) adapters.push(a as Address);
  }
  return adapters;
}

async function getAdapterMeta(client: any, adapter: Address): Promise<AdapterMeta> {
  const k = String(adapter);
  const cached = adapterMetaCache.get(k);
  if (cached && cached.gasUnits) return cached;

  const [name, gas] = await Promise.all([
    client.readContract({ address: adapter, abi: ADAPTER_ABI, functionName: "name" }).catch(() => ""),
    client.readContract({ address: adapter, abi: ADAPTER_ABI, functionName: "swapGasEstimate" }).catch(() => 120_000n),
  ]);
  const meta = { name: String(name), gasUnits: BigInt(gas as any) };
  adapterMetaCache.set(k, meta);
  return meta;
}

async function adapterQueryCached(client: any, adapter: Address, amountInWei: bigint, tokenIn: Address, tokenOut: Address) {
  const key = `${adapter}|${amountInWei}|${tokenIn}|${tokenOut}`;
  const cached = queryCache.get(key);
  if (cached !== undefined) return cached;
  const out = await client.readContract({
    address: adapter,
    abi: ADAPTER_ABI,
    functionName: "query",
    args: [amountInWei, tokenIn, tokenOut],
  }).catch(() => 0n as any);
  queryCache.set(key, BigInt(out as any));
  return BigInt(out as any);
}

