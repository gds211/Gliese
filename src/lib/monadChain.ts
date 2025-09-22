// src/lib/monadChain.ts
import type { Chain } from 'viem';

export const monadChain = {
  id: 34_443, // or 10_143 for testnet
  name: 'Monad',
  nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.monad.xyz'] }, // use testnet URL if 10143
    public:  { http: ['https://rpc.monad.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Monad Explorer', url: 'https://explorer.monad.xyz' },
  },
} as const satisfies Chain;

