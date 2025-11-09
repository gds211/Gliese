// src/config/wagmi.ts
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http, webSocket } from "wagmi";
import { fallback } from "viem";
import { PUBLIC_CONFIG, WALLETCONNECT_PROJECT_ID } from "@/config/public";

export const monadTestnet = {
  id: PUBLIC_CONFIG.CHAIN_ID,
  name: "Monad Testnet",
  nativeCurrency: {
    name: "Monad",
    symbol: PUBLIC_CONFIG.NATIVE_SYMBOL,
    decimals: PUBLIC_CONFIG.NATIVE_DECIMALS,
  },
  rpcUrls: { default: { http: [PUBLIC_CONFIG.RPC_URL] } },
  blockExplorers: {
    default: { name: PUBLIC_CONFIG.EXPLORER_NAME, url: PUBLIC_CONFIG.EXPLORER_URL },
  },
  testnet: true,
} as const;

export const config = getDefaultConfig({
  appName: PUBLIC_CONFIG.APP_NAME,
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: [monadTestnet],
  transports: {
    [monadTestnet.id]:
      PUBLIC_CONFIG.WS_URL && PUBLIC_CONFIG.WS_URL.length > 0
        ? fallback([webSocket(PUBLIC_CONFIG.WS_URL), http(PUBLIC_CONFIG.RPC_URL)])
        : http(PUBLIC_CONFIG.RPC_URL),
  },
});
