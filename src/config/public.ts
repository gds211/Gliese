export const PUBLIC_CONFIG = {
  APP_NAME: 'Gliese',
  APP_VERSION: '1.0.0',
  // Add other public configuration constants here
  CHAIN_ID: 34_443, // Monad chain ID
  RPC_URL: 'https://rpc.monad.xyz',
  EXPLORER_URL: 'https://explorer.monad.xyz',
} as const;

export type PublicConfig = typeof PUBLIC_CONFIG;