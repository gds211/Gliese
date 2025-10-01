// src/config/wagmi.ts
import { http, cookieStorage } from "wagmi";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { PUBLIC_CONFIG } from "@/config/public";

// Keep all chain details in PUBLIC_CONFIG
export const monadTestnet = {
  id: PUBLIC_CONFIG.CHAIN_ID,
  name: "Monad Testnet",
  nativeCurrency: {
    name: "Monad",
    symbol: PUBLIC_CONFIG.NATIVE_SYMBOL,
    decimals: PUBLIC_CONFIG.NATIVE_DECIMALS,
  },
  rpcUrls: {
    default: { http: [PUBLIC_CONFIG.RPC_URL] },
    public:  { http: [PUBLIC_CONFIG.RPC_URL] },
  },
  blockExplorers: {
    default: { name: "Monad Explorer", url: PUBLIC_CONFIG.EXPLORER_URL },
  },
} as const;

export const config = getDefaultConfig({
  appName: PUBLIC_CONFIG.APP_NAME,
  projectId: PUBLIC_CONFIG.WALLETCONNECT_PROJECT_ID,
  chains: [monadTestnet],
  ssr: false,
  storage: cookieStorage,
  transports: {
    [monadTestnet.id]: http(PUBLIC_CONFIG.RPC_URL),
  },
});
