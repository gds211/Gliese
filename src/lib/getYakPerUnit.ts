// src/lib/getYakPerUnit.ts
import type { Address } from "viem";
import { formatUnits, parseUnits } from "viem";
import { getPublicClient } from "wagmi/actions";
import { config } from "@/config/wagmi";
import { YAK_ROUTER_ABI } from "@/abi/yakRouter";
import { PUBLIC_CONFIG } from "@/config/public";
import { getDecimals } from "@/lib/decimals";

const ZERO = "0x0000000000000000000000000000000000000000";
const isNative = (v?: string) =>
  !v || v.toUpperCase() === PUBLIC_CONFIG.NATIVE_SYMBOL || v === ZERO;
const toQuoteAddr = (v?: string): Address =>
  isNative(v) ? (ZERO as Address) : ((v as Address) ?? (ZERO as Address));

/** Returns OUT/IN (dimensionless) for an arbitrary input size, or null on failure. */
export async function getYakPerUnit(params: {
  router: Address;
  tokenIn?: string;
  tokenOut?: string;
  amountInHuman: number | string;
}): Promise<number | null> {
  try {
    const client = getPublicClient(config);

    const tokenInAddr  = toQuoteAddr(params.tokenIn);
    const tokenOutAddr = toQuoteAddr(params.tokenOut);

    const [inDec, outDec] = await Promise.all([
      getDecimals(client as any, isNative(params.tokenIn) ? ZERO : (tokenInAddr as string)),
      getDecimals(client as any, isNative(params.tokenOut) ? ZERO : (tokenOutAddr as string)),
    ]);

    const amtNum = Number(params.amountInHuman);
    if (!Number.isFinite(amtNum) || amtNum <= 0) return null;

    const amountIn = parseUnits(String(params.amountInHuman), inDec);
    const gasWei = PUBLIC_CONFIG.GAS_PRICE_WEI_FALLBACK;

    const formatted = await (client as any).readContract({
      address: params.router,
      abi: YAK_ROUTER_ABI,
      functionName: "findBestPathWithGas",
      args: [ amountIn, tokenInAddr, tokenOutAddr, BigInt(PUBLIC_CONFIG.MAX_STEPS), gasWei ],
    });

    const amounts: bigint[] = formatted?.amounts ?? formatted?.[0] ?? [];
    if (!amounts.length) return null;

    const outRaw = amounts[amounts.length - 1];
    const outFloat = Number(formatUnits(outRaw, outDec));
    if (!Number.isFinite(outFloat) || outFloat <= 0) return null;

    return outFloat / amtNum;
  } catch {
    return null;
  }
}

