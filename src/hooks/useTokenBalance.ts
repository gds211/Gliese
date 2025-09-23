// src/hooks/useTokenBalance.ts
import { useMemo } from "react";
import { useAccount, useBalance } from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { PUBLIC_CONFIG } from "@/config/public";

/**
 * Minimal token metadata shape your app uses.
 * If you already have a Token type, feel free to replace this.
 */
export type TokenMeta = {
  symbol: string;
  address?: `0x${string}`; // undefined for native coin
  decimals?: number;       // optional (wagmi returns actual decimals from chain)
};

/**
 * Floors a bigint token amount to a display string without rounding up.
 * Prevents "insufficient funds" from accidental up-rounding in inputs.
 */
export function toDecimalStringFloor(
  bn: bigint,
  decimals: number,
  displayDecimals = 6
): string {
  // Fast path: if we’re not reducing precision, just format and trim
  if (displayDecimals >= decimals) {
    const s = formatUnits(bn, decimals);
    return s.includes(".")
      ? s.replace(/(\.\d{1,18}?)0+$/, "$1").replace(/\.$/, "")
      : s;
  }
  const scaleDown = BigInt(decimals - displayDecimals);
  const factor = 10n ** scaleDown;
  const floored = (bn / factor) * factor;
  let s = formatUnits(floored, decimals);
  s = s.includes(".")
    ? s.replace(/(\.\d{1,18}?)0+$/, "$1").replace(/\.$/, "")
    : s;
  return s;
}

/**
 * Returns live balance data for the requested token symbol.
 * – Auto-detects native vs ERC-20 using PUBLIC_CONFIG.NATIVE_SYMBOL
 * – Reads on the configured CHAIN_ID
 */
export function useTokenBalance(opts: {
  symbol: string;
  tokens: TokenMeta[];
  gasBufferForNative?: string; // e.g., "0.003" (as decimal string)
}) {
  const { symbol, tokens, gasBufferForNative = "0.01" } = opts;
  const { address, isConnected } = useAccount();

  const isNative = symbol === PUBLIC_CONFIG.NATIVE_SYMBOL;

  const tokenMeta = useMemo(
    () => tokens.find((t) => t.symbol === symbol),
    [tokens, symbol]
  );

  const tokenAddress = isNative ? undefined : (tokenMeta?.address as `0x${string}` | undefined);

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useBalance({
    address,
    token: tokenAddress,
    chainId: PUBLIC_CONFIG.CHAIN_ID,
    query: { enabled: Boolean(address) },
    // Note: wagmi fetches decimals/format from chain; safer than local list.
  });

  const decimals = data?.decimals ?? (tokenMeta?.decimals ?? 18);
  const raw = data?.value ?? 0n;

  // Compute spendable raw (leave gas for native coin)
  const gasBufferRaw = isNative ? parseUnits(gasBufferForNative, decimals) : 0n;
  const spendableRaw = isNative
    ? raw > gasBufferRaw
      ? raw - gasBufferRaw
      : 0n
    : raw;

  // Pretty displays
  const displayBalance = toDecimalStringFloor(raw, decimals, 4);
  const displaySpendable = toDecimalStringFloor(spendableRaw, decimals, 4);

  return {
    isConnected,
    isNative,
    decimals,
    raw,                 // full raw balance
    spendableRaw,        // raw - gasBuffer (if native)
    displayBalance,      // "123.4567"
    displaySpendable,    // with buffer applied for native
    isLoading,
    isError,
    refetch,
  };
}
