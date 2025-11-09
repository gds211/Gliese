// App Configuration
// src/config/public.ts

export const PUBLIC_CONFIG = {
  APP_NAME: "Gliese",
  APP_VERSION: "1.0.0",

  // --- Chain target (Monad Testnet) ---
  CHAIN_ID: 10143,
  RPC_URL: "https://testnet-rpc.monad.xyz",
  /** Optional WebSocket endpoint that matches the RPC node above.
   *  If you aren't sure, leave this string empty ("") and the app will fall back to HTTP-only.
   */
  WS_URL: "wss://testnet-rpc.monad.xyz/ws",

  EXPLORER_NAME: "SocialScan",
  EXPLORER_URL: "https://monad-testnet.socialscan.io",
  NATIVE_SYMBOL: "MON",
  NATIVE_DECIMALS: 18,

  // --- Yak integration ---
  YAK_ROUTER: "0x1460378be68bbea04a6b21271a3850229e6d087d",
  WRAPPED_NATIVE: "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701",

  // --- Quote & fee behaviour ---
  MAX_STEPS: 4,

  GAS_PRICE_WEI_FALLBACK: 60_000_000_000n,   // only if fee queries fail

  // Legacy millisecond knobs (used as HTTP fallbacks)
  FEE_REFRESH_MS: 800,                       // used as pollingInterval if WS is unavailable
  QUOTE_POLL_MS: 1000,                       // used as pollingInterval if WS is unavailable

  // WebSocket mode: block-driven throttles
  FEE_REFRESH_BLOCKS: 5,                     // call estimateFeesPerGas once every N blocks
  UNIT_QUOTE_EVERY_N_BLOCKS: 5,              // run the 1‑unit quote every N blocks (reduces load)

  UPDATE_THRESHOLD_BPS: 1n,                  // suppress tiny UI updates
  SLIPPAGE_BPS: 500n,                        // default manual slippage (5%)

  // --- Dynamic (auto) slippage config ---
  AUTO_SLIPPAGE: {
    ENABLED_BY_DEFAULT: true,

    // Base/limits (bps)
    BASE_BPS: 30,           // 0.30%
    MIN_BPS: 50,            // 0.50% absolute floor
    MAX_BPS: 500,           // 5.00% hard cap

    // Volatility model
    EWMA_ALPHA: 0.20,
    QRET_WINDOW: 48,
    QRET_QUANTILE: 0.95,
    VOL_SCALE: 1.0,

    // Size impact
    SIZE_FACTOR: 1.0,

    // Path complexity / MEV
    PER_HOP_BPS: 4,
    MEV_PROTECTED: true,

    // Stability
    UP_HYSTERESIS_BPS: 3,
    DOWN_HYSTERESIS_BPS: 6,
    COOL_OFF_BPS_PER_SEC: 25,

    // Elasticity probe (keep, but a bit less frequent)
    ELASTICITY_PROBE: true,
    PROBE_EPS: 0.02,                // +2% bump
    PROBE_MIN_INTERVAL_MS: 5000,    // was 2500
  },
} as const;

export type PublicConfig = typeof PUBLIC_CONFIG;

// WalletConnect Project ID (public)
export const WALLETCONNECT_PROJECT_ID = "b6cf06bf228077666a92f5f6d69e2a77";
