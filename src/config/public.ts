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
  GAS_PRICE_WEI: 60_000_000_000n, // 60 gwei (BigInt)
  QUOTE_POLL_MS: 2000,            // poll every 2s
  UPDATE_THRESHOLD_BPS: 10n,      // 0.1% = 10 bps
  SLIPPAGE_BPS: 500n,             // 5%
} as const;

// Type helper (optional)
export type PublicConfig = typeof PUBLIC_CONFIG;

// WalletConnect Project ID is PUBLIC (from cloud.walletconnect.com)
export const WALLETCONNECT_PROJECT_ID = "b6cf06bf228077666a92f5f6d69e2a77";
