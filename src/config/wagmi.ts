// src/config/wagmi.ts
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { PUBLIC_CONFIG, WALLETCONNECT_PROJECT_ID } from "@/config/public";

export const monadTestnet = {
  id: PUBLIC_CONFIG.CHAIN_ID,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: PUBLIC_CONFIG.NATIVE_SYMBOL, decimals: PUBLIC_CONFIG.NATIVE_DECIMALS },
  rpcUrls: { default: { http: [PUBLIC_CONFIG.RPC_URL] } },
  blockExplorers: { default: { name: PUBLIC_CONFIG.EXPLORER_NAME, url: PUBLIC_CONFIG.EXPLORER_URL } },
  testnet: true,
} as const;

export const config = getDefaultConfig({
  appName: PUBLIC_CONFIG.APP_NAME,
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: [monadTestnet],
  transports: {
    [monadTestnet.id]: http(PUBLIC_CONFIG.RPC_URL),
  },
});
