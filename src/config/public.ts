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
  YAK_ROUTER: "0xb6732D24E8C3e5E67D8d18265EfeDfb2a1149d5F",

  // Wrapped native (WMON) address on Monad testnet (from your notes)
  WRAPPED_NATIVE: "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701",

  // --- Quote behaviour (UI polling, slippage, thresholds) ---
  MAX_STEPS: 4,
  GAS_PRICE_WEI_FALLBACK: 60_000_000_000n, // used ONLY if RPC fee query fails
  FEE_REFRESH_MS: 800,                    // refresh on-chain fee estimates every 0.8s
  QUOTE_POLL_MS: 1000,                     // poll quotes every 1s
  UPDATE_THRESHOLD_BPS: 5n,               // 0.05% = 5 bps
  SLIPPAGE_BPS: 500n,                      // 5%

  // --- Dynamic (auto) slippage config: adaptive + EWMA
   AUTO_SLIPPAGE: {
    ENABLED_BY_DEFAULT: true,   // UI default; the hook itself reads the fields below

    // --- Base/limits (bps) ---
    BASE_BPS: 30,               // 0.30% baseline cushion
    MIN_BPS: 5,                 // 0.05% absolute floor
    MAX_BPS: 500,               // 5.00% hard cap (seatbelt)

    // --- Volatility model (runs on per-unit returns) ---
    EWMA_ALPHA: 0.20,           // weight on newest return; if you want to mirror old EWMA_LAMBDA=0.85, set 0.15
    QRET_WINDOW: 48,            // number of recent returns to keep for robust tail
    QRET_QUANTILE: 0.95,        // tail quantile of |returns| to guard against bursts
    VOL_SCALE: 1.0,             // global knob to scale volatility contribution

    // --- Size impact (per-unit degradation scaling) ---
    SIZE_FACTOR: 1.0,           // 1.0 is neutral; >1 tightens more for size

    // --- Path complexity / MEV ---
    PER_HOP_BPS: 4,             // small additive per extra hop
    MEV_PROTECTED: true,       // set true if swaps use private relay / intents → lower MEV cushion

    // --- Hysteresis & cool-off (stability) ---
    UP_HYSTERESIS_BPS: 3,       // ignore tiny upticks smaller than this
    DOWN_HYSTERESIS_BPS: 6,     // ignore tiny downticks smaller than this
    COOL_OFF_BPS_PER_SEC: 25,    // when risk cools, drift down by this many bps/sec toward target

    // --- Optional: local elasticity probe (extra quotes; leave false to avoid extra RPCs) ---
    ELASTICITY_PROBE: true,    // true → use tiny +ε size bump to estimate curvature on CLMM paths
    PROBE_EPS: 0.02,            // +2% input bump
    PROBE_MIN_INTERVAL_MS: 2500 // min spacing between probes
  },

} as const;

// Type helper (optional)
export type PublicConfig = typeof PUBLIC_CONFIG;

// WalletConnect Project ID is PUBLIC (from cloud.walletconnect.com)
export const WALLETCONNECT_PROJECT_ID = "b6cf06bf228077666a92f5f6d69e2a77";
