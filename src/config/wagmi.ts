import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
import { monadChain } from '../lib/monadChain';
import { PUBLIC_CONFIG, WALLETCONNECT_PROJECT_ID } from './public';

// Hard-fail early if the Project ID is missing/obviously wrong.
if (!WALLETCONNECT_PROJECT_ID || WALLETCONNECT_PROJECT_ID.length < 20) {
  throw new Error('WALLETCONNECT_PROJECT_ID missing/invalid in src/config/public.ts');
}

export const wagmiConfig = getDefaultConfig({
  appName: PUBLIC_CONFIG.APP_NAME,
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: [monadChain],
  transports: {
    [monadChain.id]: http(PUBLIC_CONFIG.RPC_URL),
  },
  ssr: false,
});