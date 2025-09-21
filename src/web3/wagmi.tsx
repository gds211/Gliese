import { ReactNode } from 'react';
import { http, createConfig } from 'wagmi';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { monadTestnet } from './chains';

const WALLETCONNECT_PROJECT_ID =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? 'demo-project-id';

export const wagmiConfig = createConfig(
  getDefaultConfig({
    appName: 'Yak Aggregator',
    projectId: WALLETCONNECT_PROJECT_ID,
    chains: [monadTestnet],
    transports: { 
      [monadTestnet.id]: http(monadTestnet.rpcUrls.default.http[0])
    },
    ssr: false,
  })
);

const queryClient = new QueryClient();

export function Web3Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}