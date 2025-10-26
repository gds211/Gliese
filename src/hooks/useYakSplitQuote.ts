// src/hooks/useYakSplitQuote.ts
import { useEffect, useMemo, useRef, useState } from "react";
import type { Address, PublicClient } from "viem";
import { encodeFunctionData, decodeFunctionResult, formatUnits, parseUnits } from "viem";
import { usePublicClient } from "wagmi";
import { YAK_ROUTER_ABI } from "@/abi/yakRouter";
import { MULTICALL3_ABI, type Aggregate3Call } from "@/abi/multicall3";
import { PUBLIC_CONFIG } from "@/config/public";
import { getDecimals } from "@/lib/decimals";
import { useNetworkFees } from "@/hooks/useNetworkFees";

type Offer = {
  amounts: bigint[];         // increasing per hop; last is out
  adapters: Address[];
  path: Address[];
  gasEstimate: bigint;
};

type SingleResult = {
  grossOut: bigint;
  netOut: bigint;            // after gas (converted to tokenOut units)
  gas: bigint;               // gas units
  offer: Offer;
};

type SplitPart = { fraction: number; result: SingleResult };
export type SplitPlan =
  | { mode: "single"; baseline: SingleResult }
  | { mode: "split"; baseline: SingleResult; parts: [SplitPart, SplitPart]; combined: { grossOut: bigint; netOut: bigint; gas: bigint }, improvementBps: number };

const ZERO = "0x0000000000000000000000000000000000000000";
const isNative = (v?: string) =>
  !v || v.toUpperCase() === PUBLIC_CONFIG.NATIVE_SYMBOL || v === ZERO;

function toQuoteAddr(v?: string) {
  return (isNative(v) ? (PUBLIC_CONFIG.WRAPPED_NATIVE as Address) : (v as Address));
}

function last<T>(a: readonly T[]) { return a[a.length - 1]; }

function toBps(numer: bigint, denom: bigint): number {
  if (denom === 0n) return 0;
  return Number((numer * 10000n) / denom);
}

/**
 * Decode Yak FormattedOffer returned by findBestPathWithGas
 * struct FormattedOffer { uint256[] amounts; address[] adapters; address[] path; uint256 gasEstimate; }
 */
function decodeOffer(ret: `0x${string}`): Offer {
  const [amounts, adapters, path, gasEstimate] = (decodeFunctionResult({
    abi: YAK_ROUTER_ABI as any,
    functionName: "findBestPathWithGas",
    data: ret,
  }) as any) as [bigint[], Address[], Address[], bigint];

  return { amounts, adapters, path, gasEstimate };
}

export function useYakSplitQuote(opts: {
  enabled?: boolean;
  router: Address;
  tokenIn?: string | null;   // address or native symbol
  tokenOut?: string | null;  // address or native symbol
  amountInHuman?: string | number;
  maxSteps?: number;         // Yak path depth cap (1..4)
  grid?: number[];           // split grid in percent for the first shard, e.g. [10,20,30,40,50]
}) {
  const client = usePublicClient();
  const { effectiveGasPriceWei } = useNetworkFees();     // unified pricing from your existing hook
  const [plan, setPlan] = useState<SplitPlan | null>(null);

  const enabled  = !!opts.enabled;
  const router   = opts.router;
  const amountInHuman = opts.amountInHuman ?? "";
  const tokenInAddr  = toQuoteAddr(opts.tokenIn ?? undefined);
  const tokenOutAddr = toQuoteAddr(opts.tokenOut ?? undefined);
  const maxSteps = BigInt(opts.maxSteps ?? (PUBLIC_CONFIG as any).MAX_STEPS ?? 3);
  const gasWei   = BigInt(effectiveGasPriceWei ?? (PUBLIC_CONFIG as any).GAS_PRICE_WEI_FALLBACK ?? 0n);
  const grid     = (opts.grid && opts.grid.length ? opts.grid : [10,20,30,40,50]).filter(p => p > 0 && p < 100);

  // cache decimals
  const decCache = useRef<Map<string, number>>(new Map());

  async function getDecimalsCached(pc: PublicClient, addr: Address, native: boolean) {
    const key = `${pc.chain?.id ?? 0}:${native ? ZERO : (addr as string).toLowerCase()}`;
    const hit = decCache.current.get(key);
    if (hit != null) return hit;
    const d = await getDecimals(pc, native ? ZERO : addr);
    decCache.current.set(key, d);
    return d;
  }

  useEffect(() => {
    let dead = false;
    async function run() {
      try {
        if (!enabled || !client) { setPlan(null); return; }
        if (!router || !amountInHuman || +amountInHuman <= 0) { setPlan(null); return; }

        // decimals & parsing
        const [inDec, outDec, nativeDec] = await Promise.all([
          getDecimalsCached(client, tokenInAddr,  isNative(opts.tokenIn ?? undefined)),
          getDecimalsCached(client, tokenOutAddr, isNative(opts.tokenOut ?? undefined)),
          Promise.resolve(PUBLIC_CONFIG.NATIVE_DECIMALS ?? 18),
        ]);
        const amountIn = parseUnits(String(amountInHuman), inDec);

        // 1) Build multicall payload:
        //    - baseline: findBestPathWithGas(amountIn)
        //    - splits:   for each p in grid -> a1 = p%, a2 = (100-p)%
        //    - rate:     outPerNative = findBestPathWithGas(1e18, WNATIVE->tokenOut, gas=0)
        const calls: Aggregate3Call[] = [];

        // encode helper
        const encBest = (amt: bigint, _in: Address, _out: Address, gas: bigint) =>
          encodeFunctionData({
            abi: YAK_ROUTER_ABI as any,
            functionName: "findBestPathWithGas",
            args: [amt, _in, _out, maxSteps, gas],
          });

        // baseline
        calls.push({
          target: router,
          allowFailure: false,
          callData: encBest(amountIn, tokenInAddr, tokenOutAddr, gasWei),
        });

        // splits
        const parts: Array<[number, bigint, bigint]> = [];
        for (const p of grid) {
          const a1 = (amountIn * BigInt(p)) / 100n;
          const a2 = amountIn - a1;
          parts.push([p, a1, a2]);
          calls.push({ target: router, allowFailure: true, callData: encBest(a1, tokenInAddr, tokenOutAddr, gasWei) });
          calls.push({ target: router, allowFailure: true, callData: encBest(a2, tokenInAddr, tokenOutAddr, gasWei) });
        }

        // outPerNative
        const wnative = (PUBLIC_CONFIG.WRAPPED_NATIVE as Address);
        const oneNative = parseUnits("1", nativeDec);
        calls.push({ target: router, allowFailure: true, callData: encBest(oneNative, wnative, tokenOutAddr, 0n) });

        // 2) Multicall3
        const aggregateRes = await (client as any).readContract({
          address: PUBLIC_CONFIG.MULTICALL3_ADDRESS as Address,
          abi: MULTICALL3_ABI,
          functionName: "aggregate3",
          args: [calls],
        }) as Array<{ success: boolean; returnData: `0x${string}` }>;

        // 3) Decode baseline
        let idx = 0;
        const baselineOffer = decodeOffer(aggregateRes[idx++].returnData);
        const baselineGrossOut = last(baselineOffer.amounts);
        const baselineGas      = baselineOffer.gasEstimate;

        // 4) Decode splits
        const splitResults: Array<{ p: number; r1?: Offer; r2?: Offer }> = [];
        for (const [p] of parts) {
          const r1 = aggregateRes[idx++];
          const r2 = aggregateRes[idx++];
          splitResults.push({
            p,
            r1: r1.success ? decodeOffer(r1.returnData) : undefined,
            r2: r2.success ? decodeOffer(r2.returnData) : undefined,
          });
        }

        // 5) outPerNative
        const rateCall = aggregateRes[idx++];
        let outPerNative = 0n;
        if (rateCall.success) {
          const rateOffer = decodeOffer(rateCall.returnData);
          outPerNative = last(rateOffer.amounts); // tokenOut per 1 native
        }
        if (isNative(opts.tokenOut ?? undefined)) {
          outPerNative = parseUnits("1", nativeDec); // 1 native == 1 native
        }

        // 6) Compute net baseline
        const gasToOut = (g: bigint) => {
          if (outPerNative === 0n) return 0n; // if no route to out token, be conservative
          // gasWei * gasUnits in wei native; convert to tokenOut: multiply by outPerNative / 1e18
          return (g * gasWei * outPerNative) / parseUnits("1", nativeDec);
        };
        const baselineNetOut = baselineGrossOut - gasToOut(baselineGas);

        const baseline: SingleResult = {
          grossOut: baselineGrossOut,
          netOut: baselineNetOut,
          gas: baselineGas,
          offer: baselineOffer,
        };

        // 7) Evaluate splits
        let best: { parts: [SplitPart, SplitPart]; grossOut: bigint; netOut: bigint; gas: bigint } | null = null;

        for (let i = 0; i < parts.length; i++) {
          const [p] = parts[i];
          const r = splitResults[i];
          if (!r.r1 || !r.r2) continue;

          const gGross = last(r.r1.amounts) + last(r.r2.amounts);
          const gGas   = r.r1.gasEstimate + r.r2.gasEstimate;
          const gNet   = gGross - gasToOut(gGas);

          const partA: SplitPart = {
            fraction: p / 100,
            result: { grossOut: last(r.r1.amounts), netOut: last(r.r1.amounts) - gasToOut(r.r1.gasEstimate), gas: r.r1.gasEstimate, offer: r.r1 },
          };
          const partB: SplitPart = {
            fraction: (100 - p) / 100,
            result: { grossOut: last(r.r2.amounts), netOut: last(r.r2.amounts) - gasToOut(r.r2.gasEstimate), gas: r.r2.gasEstimate, offer: r.r2 },
          };

          if (!best || gNet > best.netOut) {
            best = { parts: [partA, partB], grossOut: gGross, netOut: gNet, gas: gGas };
          }
        }

        if (!best || best.netOut <= baseline.netOut) {
          if (!dead) setPlan({ mode: "single", baseline });
          return;
        }

        const improvementBps = toBps(best.netOut - baseline.netOut, baseline.netOut);
        if (!dead) setPlan({ mode: "split", baseline, parts: best.parts, combined: { grossOut: best.grossOut, netOut: best.netOut, gas: best.gas }, improvementBps });
      } catch {
        if (!dead) setPlan(null);
      }
    }

    run();
    const t = setInterval(run, PUBLIC_CONFIG.QUOTE_POLL_MS ?? 2000);
    return () => { dead = true; clearInterval(t); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, client, router, tokenInAddr, tokenOutAddr, amountInHuman, effectiveGasPriceWei, (opts.grid||[]).join(",")]);

  return useMemo(() => plan, [plan]);
}

