// src/hooks/useYakQuote.ts
import { useEffect, useMemo, useRef, useState } from "react";
import { Address, PublicClient, formatUnits, parseUnits } from "viem";
import { usePublicClient } from "wagmi";
import { YAK_ROUTER_ABI } from "@/abi/yakRouter";
import { PUBLIC_CONFIG } from "@/config/public";
import { getDecimals } from "@/lib/decimals";
import { changedByAtLeastBps } from "@/lib/math";
import { isNative, toQuoteAddress } from "@/lib/tokens";

export type QuoteState = {
  outRaw: bigint;           // exact out from router
  minOutRaw: bigint;        // slippage applied
  outFormatted: string;     // human string using tokenOut decimals
  minOutFormatted: string;  // human string using tokenOut decimals
  path: Address[];
  adapters: Address[];
  gasUsed: bigint;
};

type Params = {
  router: Address;
  tokenIn?: string;    // symbol or address; if native, pass "MON" or undefined
  tokenOut?: string;   // symbol or address
  amountInHuman: string; // user input like "1.23"
  enabled?: boolean;
};

export function useYakQuote({ router, tokenIn, tokenOut, amountInHuman, enabled = true }: Params) {
  const client = usePublicClient() as PublicClient;
  const [quote, setQuote] = useState<QuoteState | null>(null);
  const lastMinOutRef = useRef<bigint | null>(null);
  const reqCounter = useRef(0);

  const polling = enabled && !!router && !!tokenOut && !!amountInHuman && +amountInHuman > 0;

  // Convert to addresses used by the router for quoting (wrapped for native)
  const tokenInAddr  = toQuoteAddress(tokenIn) as Address;
  const tokenOutAddr = toQuoteAddress(tokenOut) as Address;

  useEffect(() => {
    if (!polling) { setQuote(null); lastMinOutRef.current = null; return; }

    let timer: any;
    let cancelled = false;

    async function tick() {
      const myReq = ++reqCounter.current;

      try {
        // decimals
        const [inDec, outDec] = await Promise.all([
          getDecimals(client, isNative(tokenIn) ? "0x0000000000000000000000000000000000000000" : tokenInAddr),
          getDecimals(client, isNative(tokenOut) ? "0x0000000000000000000000000000000000000000" : tokenOutAddr),
        ]);

        const amountIn = parseUnits(amountInHuman, inDec);

        if (amountIn === 0n) {
          if (myReq === reqCounter.current && !cancelled) {
            setQuote(null);
            lastMinOutRef.current = null;
          }
          return;
        }

        const [amounts, adapters, path, gasUsed] = await client.readContract({
          address: router,
          abi: YAK_ROUTER_ABI,
          functionName: "findBestPathWithGas",
          args: [ amountIn, tokenInAddr, tokenOutAddr, BigInt(PUBLIC_CONFIG.MAX_STEPS), PUBLIC_CONFIG.GAS_PRICE_WEI ],
        }) as [bigint[], Address[], Address[], bigint];

        const outRaw = amounts?.length ? amounts[amounts.length - 1] : 0n;

        // Apply 5% slippage: minOut = outRaw * 9500 / 10000
        const minOutRaw = (outRaw * (10_000n - PUBLIC_CONFIG.SLIPPAGE_BPS)) / 10_000n;

        // Only update if change >= threshold
        if (!changedByAtLeastBps(lastMinOutRef.current, minOutRaw, PUBLIC_CONFIG.UPDATE_THRESHOLD_BPS)) {
          // Skip UI update
        } else {
          const outFormatted   = formatUnits(outRaw, outDec);
          const minOutFormatted = formatUnits(minOutRaw, outDec);

          if (myReq === reqCounter.current && !cancelled) {
            setQuote({ outRaw, minOutRaw, outFormatted, minOutFormatted, path, adapters, gasUsed });
            lastMinOutRef.current = minOutRaw;
          }
        }
      } catch (err) {
        // No route or call error
        if (myReq === reqCounter.current && !cancelled) {
          // Don’t nuke prior good quote; just keep it or clear if none
          if (!quote) setQuote(null);
        }
      } finally {
        if (!cancelled) {
          timer = setTimeout(tick, PUBLIC_CONFIG.QUOTE_POLL_MS);
        }
      }
    }

    tick();
    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polling, router, tokenInAddr, tokenOutAddr, amountInHuman]);

  return quote;
}
