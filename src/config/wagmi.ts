// src/config/wagmi.ts
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http, webSocket } from "wagmi";
import { PUBLIC_CONFIG, WALLETCONNECT_PROJECT_ID } from "@/config/public";

export const monadTestnet = {
  id: PUBLIC_CONFIG.CHAIN_ID,
  name: "Monad Testnet",
  nativeCurrency: {
    name: "Monad",
    symbol: PUBLIC_CONFIG.NATIVE_SYMBOL,
    decimals: PUBLIC_CONFIG.NATIVE_DECIMALS,
  },
  rpcUrls: {
    default: {
      // All read calls should hit HTTP so viem can JSON‑RPC batch them.
      http: [PUBLIC_CONFIG.RPC_URL],
    },
  },
  blockExplorers: {
    default: { name: PUBLIC_CONFIG.EXPLORER_NAME, url: PUBLIC_CONFIG.EXPLORER_URL },
  },
  testnet: true,
} as const;

export const config = getDefaultConfig({
  appName: PUBLIC_CONFIG.APP_NAME,
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: [monadTestnet],
  // Use HTTP with batching for ALL reads.
  transports: {
    [monadTestnet.id]: http(PUBLIC_CONFIG.RPC_URL, {
      // Micro-batch window; 10–20ms is a good sweet spot.
      batch: { wait: 12 },
      retryCount: 1,
      fetchOptions: { keepalive: true },
    }),
  },
  // Use WS *only* for subscriptions (watchers).
  webSocketTransport: {
    [monadTestnet.id]: webSocket(
      PUBLIC_CONFIG.RPC_WS_URL ?? PUBLIC_CONFIG.RPC_URL.replace(/^http/i, "ws")
    ),
  },
  ssr: false,
});
