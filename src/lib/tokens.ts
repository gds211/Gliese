// src/lib/tokens.ts
import { PUBLIC_CONFIG } from "@/config/public";

export const isNative = (symbolOrAddr?: string) =>
  !symbolOrAddr || symbolOrAddr.toUpperCase() === PUBLIC_CONFIG.NATIVE_SYMBOL || symbolOrAddr === "0x0000000000000000000000000000000000000000";

export const toQuoteAddress = (symbolOrAddr?: string) =>
  isNative(symbolOrAddr) ? PUBLIC_CONFIG.WRAPPED_NATIVE : (symbolOrAddr as `0x${string}`);
