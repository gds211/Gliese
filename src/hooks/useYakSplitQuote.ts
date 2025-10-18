// src/hooks/useYakSplitQuote.ts
import { useEffect, useMemo, useState } from "react";
import type { Address } from "viem";
import { usePublicClient } from "wagmi";
import { YAK_ROUTER_ABI } from "@/abi/yakRouter";
import { useNetworkFees } from "@/hooks/useNetworkFees";

export type FormattedOffer = {
  amounts: bigint[];
  adapters: Address[];
  path: Address[];
  gasEstimate: bigint;
};

export type SplitPlan = {
  a: { amountIn: bigint; offer: FormattedOffer };
  b: { amountIn: bigint; offer: FormattedOffer };
  totalOut: bigint;
  ratioA: number; // in [0,1]
};

type State = {
  loading: boolean;
  error?: string;
  single?: { offer: FormattedOffer; out: bigint };
  split?: SplitPlan;
};

function last<T>(arr: readonly T[]): T {
  return arr[arr.length - 1] as T;
}

export function useYakSplitQuote(params: {
  router: Address;
  tokenIn: Address | undefined;
  tokenOut: Address | undefined;
  amountIn: bigint;          // atomic (tokenIn decimals)
  maxSteps?: number;         // default 3
  enableSplit?: boolean;     // default true
}) {
  const { router, tokenIn, tokenOut, amountIn } = params;
  const maxSteps = params.maxSteps ?? 3;
  const enableSplit = params.enableSplit ?? true;

  const client = usePublicClient();
  const fees = useNetworkFees(1500);

  const [state, setState] = useState<State>({ loading: false });

  useEffect(() => {
    let dead = false;

    async function run() {
      if (!client || !router || !tokenIn || !tokenOut || !amountIn || amountIn === 0n) {
        setState({ loading: false, error: undefined, single: undefined, split: undefined });
        return;
      }
      setState((s) => ({ ...s, loading: true, error: undefined }));

      const gasPrice = fees.effectiveGasPriceWei ?? 0n;

      async function quote(amount: bigint): Promise<{ offer: FormattedOffer; out: bigint }> {
        const offer = await (client as any).readContract({
          address: router,
          abi: YAK_ROUTER_ABI,
          functionName: "findBestPathWithGas",
          args: [amount, tokenIn, tokenOut, BigInt(maxSteps), gasPrice],
        });
        const out = offer.path.length > 0 ? BigInt(last(offer.amounts)) : 0n;
        return { offer, out };
      }

      try {
        // 1) Best single-route
        const single = await quote(amountIn);

        // 2) Optional: best split (grid search + local refine)
        let best: SplitPlan | undefined = undefined;
        if (enableSplit) {
          // coarse grid, then refine
          const grid = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1];
          async function evalAt(r: number): Promise<SplitPlan> {
            const aIn = BigInt(Math.floor(Number(amountIn) * r));
            const bIn = amountIn - aIn;
            const [qa, qb] = await Promise.all([quote(aIn), quote(bIn)]);
            return {
              a: { amountIn: aIn, offer: qa.offer },
              b: { amountIn: bIn, offer: qb.offer },
              totalOut: qa.out + qb.out,
              ratioA: r,
            };
          }

          // coarse
          const coarse = await Promise.all(grid.map(evalAt));
          best = coarse.reduce((acc, x) => (x.totalOut > acc.totalOut ? x : acc), coarse[0]);

          // refine locally around best
          let step = 0.125;
          while (step > 0.02) {
            const around = [best.ratioA - step, best.ratioA, best.ratioA + step]
              .filter((r) => r >= 0 && r <= 1);
            const cand = await Promise.all(around.map(evalAt));
            const local = cand.reduce((acc, x) => (x.totalOut > acc.totalOut ? x : acc), cand[0]);
            if (local.totalOut > best.totalOut) best = local;
            step /= 2;
          }
        }

        if (!dead) {
          setState({
            loading: false,
            single: { offer: single.offer, out: single.out },
            split: best,
          });
        }
      } catch (e: any) {
        if (!dead) setState({ loading: false, error: e?.message ?? String(e) });
      }
    }

    run();
    return () => { dead = true; };
  }, [client, router, tokenIn, tokenOut, amountIn, maxSteps, enableSplit, fees.effectiveGasPriceWei]);

  return useMemo(() => state, [state]);
}

