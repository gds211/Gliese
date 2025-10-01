// src/lib/tokens.ts
import type { Address } from "viem";
import { PUBLIC_CONFIG } from "@/config/public";
import {
  TOKENS,
  TOKENS_FOR_UI,
  getTokenBySymbol,
  getTokenByAddress,
} from "@/data/tokens";

export { TOKENS, TOKENS_FOR_UI, getTokenBySymbol, getTokenByAddress };

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

/**
 * Accepts either a symbol ("MON", "USDC") or an address.
 * Returns true if the *input* represents the native token.
 */
export function isNative(input?: string) {
  if (!input) return false;
  return input.toUpperCase() === PUBLIC_CONFIG.NATIVE_SYMBOL.toUpperCase();
}

/**
 * Converts a symbol or address into the correct on-chain address for quoting.
 * - If native, we prefer WRAPPED_NATIVE (if provided in PUBLIC_CONFIG), otherwise ZERO_ADDRESS.
 * - If it's a known symbol, return its registry address.
 * - If it's already an address, return it as-is.
 */
export function toQuoteAddress(input?: string): Address | undefined {
  if (!input) return undefined;

  if (isNative(input)) {
    const wrapped = (PUBLIC_CONFIG as any).WRAPPED_NATIVE as string | undefined;
    if (wrapped && wrapped.startsWith("0x") && wrapped.length === 42) {
      return wrapped as Address;
    }
    return ZERO_ADDRESS as Address;
  }

  const bySymbol = getTokenBySymbol(input);
  if (bySymbol?.address) return bySymbol.address;

  if (input.startsWith("0x") && input.length === 42) {
    return input as Address;
  }

  return undefined;
}

