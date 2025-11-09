// src/config/wagmi.ts
import { fallback } from "viem";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http, webSocket} from "wagmi";
import { PUBLIC_CONFIG, WALLETCONNECT_PROJECT_ID } from "@/config/public";

export const monadTestnet = {
  id: PUBLIC_CONFIG.CHAIN_ID,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: PUBLIC_CONFIG.NATIVE_SYMBOL, decimals: PUBLIC_CONFIG.NATIVE_DECIMALS },
  rpcUrls: {
    default: {
      http: [PUBLIC_CONFIG.RPC_URL],
      // If RPC_WS_URL is not set, we derive ws(s):// from RPC_URL
      webSocket: [PUBLIC_CONFIG.RPC_WS_URL ?? (PUBLIC_CONFIG.RPC_URL.replace(/^http/i, "ws"))],
    },
  },
  blockExplorers: { default: { name: PUBLIC_CONFIG.EXPLORER_NAME, url: PUBLIC_CONFIG.EXPLORER_URL } },
  testnet: true,
} as const;

export const config = getDefaultConfig({
  appName: PUBLIC_CONFIG.APP_NAME,
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: [monadTestnet],
  transports: {
    [monadTestnet.id]: fallback([
      webSocket(PUBLIC_CONFIG.RPC_WS_URL ?? (PUBLIC_CONFIG.RPC_URL.replace(/^http/i, "ws"))),
      http(PUBLIC_CONFIG.RPC_URL, { batch: true }),
    ]),
  },
});
