// src/main.tsx
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

import "@rainbow-me/rainbowkit/styles.css";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config, monadTestnet } from "@/config/wagmi";
import { BlockNumberProvider } from "@/providers/BlockNumberProvider";

// No refetch-on-focus spam; short staleness since quotes/fees are block-driven.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 10_000,
      retry: 1,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <WagmiProvider config={config}>
    <QueryClientProvider client={queryClient}>
      <RainbowKitProvider initialChain={monadTestnet}>
        <BlockNumberProvider>
          <App />
        </BlockNumberProvider>
      </RainbowKitProvider>
    </QueryClientProvider>
  </WagmiProvider>
);
