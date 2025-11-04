// src/main.tsx
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { preloadLocalLogos } from "./lib/imageCache";

// Preload all local token logos immediately
preloadLocalLogos();

import "@rainbow-me/rainbowkit/styles.css";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { config, monadTestnet } from "@/config/wagmi"; // <-- use your config here

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <WagmiProvider config={config}>
    <QueryClientProvider client={queryClient}>
      <RainbowKitProvider initialChain={monadTestnet}>
        <App />
      </RainbowKitProvider>
    </QueryClientProvider>
  </WagmiProvider>
);




