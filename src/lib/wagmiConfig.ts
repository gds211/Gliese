import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
import { monadChain } from './monadChain';
import { PUBLIC_CONFIG, WALLETCONNECT_PROJECT_ID } from '@/config/public';

if (!WALLETCONNECT_PROJECT_ID || WALLETCONNECT_PROJECT_ID.length <= 20) {
  throw new Error('WALLETCONNECT_PROJECT_ID missing/invalid in src/config/public.ts');
}

export const wagmiConfig = getDefaultConfig({
  appName: PUBLIC_CONFIG.APP_NAME,
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: [monadChain], // keep only chains you actually support
  transports: {
    [monadChain.id]: http(PUBLIC_CONFIG.RPC_URL), // explicit RPC (avoid public-rate limits)
  },
  ssr: false,
});