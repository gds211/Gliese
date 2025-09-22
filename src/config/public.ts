export const PUBLIC_CONFIG = {
  APP_NAME: 'Gliese',
  APP_VERSION: '1.0.0',
  // All of these are PUBLIC and safe to ship to the client.
// If you ever need real secrets, use Supabase or a backend.
  // src/config/public.ts

// One public config object for your app + chain.
export const PUBLIC_CONFIG = {
  APP_NAME: 'Gliese',
  APP_VERSION: '1.0.0',

  // --- Chain target (Testnet right now) ---
  CHAIN_ID: 10143,
  RPC_URL: 'https://testnet-rpc.monad.xyz',
  EXPLORER_NAME: 'SocialScan',
  EXPLORER_URL: 'https://monad-testnet.socialscan.io',
  NATIVE_SYMBOL: 'MON',
  NATIVE_DECIMALS: 18,
} as const;

// Type helper (optional)
export type PublicConfig = typeof PUBLIC_CONFIG;

// WalletConnect Project ID is PUBLIC (from cloud.walletconnect.com)
export const WALLETCONNECT_PROJECT_ID = 'b6cf06bf228077666a92f5f6d69e2a77';


} as const;

export type PublicConfig = typeof PUBLIC_CONFIG;