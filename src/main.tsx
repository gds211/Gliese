// src/main.tsx
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// RainbowKit + wagmi providers
import '@rainbow-me/rainbowkit/styles.css';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Your config & chain
import { wagmiConfig } from './lib/wagmiConfig';
import { monadChain } from './lib/monadChain';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <WagmiProvider config={wagmiConfig}>
    <QueryClientProvider client={queryClient}>
      <RainbowKitProvider initialChain={monadChain}>
        <App />
      </RainbowKitProvider>
    </QueryClientProvider>
  </WagmiProvider>
);

