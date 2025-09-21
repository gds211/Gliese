import { defineChain } from 'viem';

const RPC = 'https://rpc.ankr.com/eth'; // Temporary RPC for demo

export const monadTestnet = defineChain({
  id: 1337, // Demo chain ID
  name: 'Monad Testnet',
  nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
  rpcUrls: { default: { http: [RPC] }, public: { http: [RPC] } },
});