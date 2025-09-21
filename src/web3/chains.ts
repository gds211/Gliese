import { defineChain } from 'viem';

const RPC = import.meta.env.VITE_MONAD_RPC_URL ?? 'https://<YOUR-MONAD-RPC>';

export const monadTestnet = defineChain({
  id: 0, // TODO: replace with Monad testnet chainId if different
  name: 'Monad Testnet',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: { default: { http: [RPC] }, public: { http: [RPC] } },
});