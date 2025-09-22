// src/lib/monadChain.ts
import type { Chain } from 'viem';

export const monadChain = {
  id: 10_143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'Monad Testnet', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testnet-rpc.monad.xyz'] },
    public:  { http: ['https://testnet-rpc.monad.xyz'] },
  },
  blockExplorers: {
    default: { name: 'SocialScan', url: 'https://monad-testnet.socialscan.io' },
  },
  iconBackground: '#0b0b0f',
} as const satisfies Chain;
