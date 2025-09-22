export const PUBLIC_CONFIG = {
  APP_NAME: 'Gliese',
  APP_VERSION: '1.0.0',
  // All of these are PUBLIC and safe to ship to the client.
// If you ever need real secrets, use Supabase or a backend.

export const APP_NAME = 'Gliese Aggregator';

// Get this from https://cloud.walletconnect.com (free).
// It is PUBLIC by design (clients must know it).
export const WALLETCONNECT_PROJECT_ID = 'b6cf06bf228077666a92f5f6d69e2a77';

// Your preferred Monad Testnet RPC endpoint (public is fine).
// You can swap this later to your own provider’s RPC.
export const MONAD_RPC_URL = 'https://testnet-rpc.monad.xyz';

// Chain metadata
export const MONAD_TESTNET = {
  id: 10143,
  name: 'Monad Testnet',
  explorerName: 'SocialScan',
  explorerUrl: https://monad-testnet.socialscan.io,
  nativeSymbol: 'MON',
  nativeDecimals: 18,
} as const;

export type PublicConfig = typeof PUBLIC_CONFIG;