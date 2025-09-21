import { defineChain } from 'viem';

// Use a fallback RPC that won't break the app - you can update this with your actual Monad RPC
const RPC = import.meta.env.VITE_MONAD_RPC_URL ?? 'https://rpc.ankr.com/eth'; // Temporary fallback

export const monadTestnet = defineChain({
  id: 1337, // Using a test chain ID - update with actual Monad testnet chainId
  name: 'Monad Testnet',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: { 
    default: { http: [RPC] }, 
    public: { http: [RPC] } 
  },
});