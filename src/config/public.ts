// App Configuration
export const APP_NAME = 'Gliese';
export const APP_VERSION = '0.0.0';
export const APP_DESCRIPTION = 'Decentralized swap interface for the Monad ecosystem';

// Blockchain Configuration
export const DEFAULT_CHAIN_ID = 34443; // Monad chain ID
export const MONAD_RPC_URL = 'https://rpc.monad.xyz';
export const MONAD_EXPLORER_URL = 'https://explorer.monad.xyz';

// WalletConnect Configuration
// Get your project ID from https://cloud.walletconnect.com
export const WALLETCONNECT_PROJECT_ID = 'YOUR_WALLETCONNECT_PROJECT_ID';

// Environment Configuration
export const IS_PRODUCTION = import.meta.env.MODE === 'production';
export const IS_DEVELOPMENT = import.meta.env.MODE === 'development';

// API Configuration
export const API_BASE_URL = IS_PRODUCTION 
  ? 'https://api.gliese.finance' 
  : 'http://localhost:3001';

// Contract Addresses (update with actual addresses when deployed)
export const CONTRACTS = {
  MULTICALL3: '0xca11bde05977b3631167028862be2a173976ca11',
  // Add other contract addresses as needed
} as const;