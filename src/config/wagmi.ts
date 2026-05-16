// src/config/wagmi.ts
import type { Chain } from "viem";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { PUBLIC_CONFIG, WALLETCONNECT_PROJECT_ID } from "@/config/public";

export const localDevnet = {
  id: PUBLIC_CONFIG.CHAIN_ID,
  name: "Local Ethereum",
  nativeCurrency: {
    name: "Ether",
    symbol: PUBLIC_CONFIG.NATIVE_SYMBOL,
    decimals: PUBLIC_CONFIG.NATIVE_DECIMALS,
  },
  rpcUrls: {
    default: {
      http: [PUBLIC_CONFIG.RPC_URL],
    },
    public: {
      http: [PUBLIC_CONFIG.RPC_URL],
    },
  },
  testnet: true,
} as const satisfies Chain;

export const config = getDefaultConfig({
  appName: PUBLIC_CONFIG.APP_NAME,
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: [localDevnet],
  transports: {
    [localDevnet.id]: http(PUBLIC_CONFIG.RPC_URL, { batch: true }),
  },
  ssr: false,
});
