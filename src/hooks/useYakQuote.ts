// src/hooks/useYakQuote.ts
import { useEffect, useRef, useState } from "react";
import type { Address } from "viem";
import { formatUnits, parseUnits } from "viem";
import { usePublicClient } from "wagmi";
import { YAK_ROUTER_ABI } from "@/abi/yakRouter";
import { PUBLIC_CONFIG } from "@/config/public";
import { getDecimals } from "@/lib/decimals";
import { changedByAtLeastBps } from "@/lib/math";

// Keep small, local helpers to avoid cross-file complex types
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const isNativeSymOrAddr = (v?: string) =>
  !v || v.toUpperCase() === PUBLIC_CONFIG.NATIVE_SYMBOL || v === ZERO_ADDRESS;
const toQuoteAddr = (v?: string) =>
  (isNativeSymOrAddr(v) ? (PUBLIC_CONFIG.WRAPPED_NATIVE as Address) : (v as Address));

export type QuoteState = {
  outRaw: bigint;           // exact out from router
  minOutRaw: bigint;        // slippage applied
  outFormatted: string;     // tokenOut decimals
  minOutFormatted: string;  // tokenOut decimals
  path: Address[];
  adapters: Address[];
  gasUsed: bigint;
};

type Params = {
  router: Address;
  tokenIn?: string;        // symbol or address; if native, pass "MON" or undefined
  tokenOut?: string;       // symbol or address
  amountInHuman: string;   // user input like "1.23"
  enabled?: boolean;
};

export function useYakQuote({ router, tokenIn, tokenOut, amountInHuman, enabled = true }: Params) {
  // IMPORTANT: don't import PublicClient type here; let wagmi infer to avoid TS2589
  const client = usePublicClient();
  const [quote, setQuote] = useState<QuoteState | null>(null);
  const lastMinOutRef = useRef<bigint | null>(null);
  const reqCounter = useRef(0);

  const polling = enabled && !!router && !!tokenOut && !!amountInHuman && +amountInHuman > 0;

  // Convert to addresses used by the router for quoting (wrap native)
  const tokenInAddr  = toQuoteAddr(tokenIn);
  const tokenOutAddr = toQuoteAddr(tokenOut);

  useEffect(() => {
    if (!polling) { setQuote(null); lastMinOutRef.current = null; return; }
    let timer: any;
    let cancelled = false;

    async function tick() {
      const myReq = ++reqCounter.current;

      try {
        // decimals (native → 18)
        const [inDec, outDec] = await Promise.all([
          getDecimals(client as any, isNativeSymOrAddr(tokenIn) ? ZERO_ADDRESS : tokenInAddr),
          getDecimals(client as any, isNativeSymOrAddr(tokenOut) ? ZERO_ADDRESS : tokenOutAddr),
        ]);

        const amountIn = parseUnits(amountInHuman, inDec);
        if (amountIn === 0n) {
          if (myReq === reqCounter.current && !cancelled) {
            setQuote(null);
            lastMinOutRef.current = null;
          }
          return;
        }

        const [amounts, adapters, path, gasUsed] = await (client as any).readContract({
          address: router,
          abi: YAK_ROUTER_ABI,
          functionName: "findBestPathWithGas",
          args: [ amountIn, tokenInAddr, tokenOutAddr, BigInt(PUBLIC_CONFIG.MAX_STEPS), PUBLIC_CONFIG.GAS_PRICE_WEI ],
        }) as [bigint[], Address[], Address[], bigint];

        const outRaw = amounts?.length ? amounts[amounts.length - 1] : 0n;

        // Apply 5% slippage: minOut = outRaw * 9500 / 10000
        const minOutRaw = (outRaw * (10_000n - PUBLIC_CONFIG.SLIPPAGE_BPS)) / 10_000n;

        // Only update if change >= threshold (e.g., 0.1%)
        if (!changedByAtLeastBps(lastMinOutRef.current, minOutRaw, PUBLIC_CONFIG.UPDATE_THRESHOLD_BPS)) {
          // no UI update
        } else {
          const outFormatted     = formatUnits(outRaw, outDec);
          const minOutFormatted  = formatUnits(minOutRaw, outDec);

          if (myReq === reqCounter.current && !cancelled) {
            setQuote({ outRaw, minOutRaw, outFormatted, minOutFormatted, path, adapters, gasUsed });
            lastMinOutRef.current = minOutRaw;
          }
        }
      } catch {
        if (myReq === reqCounter.current && !cancelled) {
          // keep previous good quote; if none, stay null
          if (!quote) setQuote(null);
        }
      } finally {
        if (!cancelled) timer = setTimeout(tick, PUBLIC_CONFIG.QUOTE_POLL_MS);
      }
    }

    tick();
    return () => { cancelled = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polling, router, tokenInAddr, tokenOutAddr, amountInHuman]);

  return quote;
}

