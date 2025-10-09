// App Configuration
// src/config/public.ts

// One public config object for your app + chain (PUBLIC values only)
export const PUBLIC_CONFIG = {
  APP_NAME: "Gliese",
  APP_VERSION: "1.0.0",

  // --- Chain target (Monad Testnet) ---
  CHAIN_ID: 10143,
  RPC_URL: "https://testnet-rpc.monad.xyz",
  EXPLORER_NAME: "SocialScan",
  EXPLORER_URL: "https://monad-testnet.socialscan.io",
  NATIVE_SYMBOL: "MON",
  NATIVE_DECIMALS: 18,

  // --- Yak integration ---
  // TODO: put your deployed YakRouter address here
  YAK_ROUTER: "0x1460378be68bbea04a6b21271a3850229e6d087d",

  // Wrapped native (WMON) address on Monad testnet (from your notes)
  WRAPPED_NATIVE: "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701",

  // --- Quote behaviour (UI polling, slippage, thresholds) ---
  MAX_STEPS: 4,
  GAS_PRICE_WEI_FALLBACK: 60_000_000_000n, // used ONLY if RPC fee query fails
  FEE_REFRESH_MS: 1500,                    // refresh on-chain fee estimates every 1.5s
  QUOTE_POLL_MS: 2000,                     // poll quotes every 2s
  UPDATE_THRESHOLD_BPS: 10n,               // 0.1% = 10 bps
  SLIPPAGE_BPS: 500n,                      // 5%

  // --- Dynamic (auto) slippage config: adaptive + EWMA
   AUTO_SLIPPAGE: {
     ENABLED_BY_DEFAULT: true,
     MIN_BPS: 10n,
     BASE_BPS: 50n,
     MAX_BPS: 500n,
     VOL_LOOKBACK: 12,        // (kept for backward-compat; unused by EWMA)
     K_SIGMA: 3,
     HYSTERESIS_BPS: 10,
     EXTRA_PER_HOP_BPS: 5n,
     EWMA_LAMBDA: 0.85,
     // ---- Adaptive size-aware top-up (factor scales with measured price impact) ----
     // Factor ∈ [IMPACT_TOPUP_MIN, IMPACT_TOPUP_MAX], rising linearly between L/H breakpoints.
     IMPACT_TOPUP_MIN: 0.30,   // factor at low impact (e.g., 0–0.25%)
     IMPACT_TOPUP_MAX: 0.60,   // factor at high impact (e.g., ≥2.5%)
     IMPACT_TOPUP_L_BPS: 20,   // lower breakpoint (bps)  = 0.25%
     IMPACT_TOPUP_H_BPS: 400,  // upper breakpoint (bps)  = 2.50%
   },

} as const;

// Type helper (optional)
export type PublicConfig = typeof PUBLIC_CONFIG;

// WalletConnect Project ID is PUBLIC (from cloud.walletconnect.com)
export const WALLETCONNECT_PROJECT_ID = "b6cf06bf228077666a92f5f6d69e2a77";
