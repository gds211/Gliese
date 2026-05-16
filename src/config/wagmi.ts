// src/config/wagmi.ts
import type { Chain } from "@rainbow-me/rainbowkit";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import { injectedWallet } from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";
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

const connectors = connectorsForWallets(
  [
    {
      groupName: "Browser Wallet",
      wallets: [injectedWallet],
    },
  ],
  {
    appName: PUBLIC_CONFIG.APP_NAME,
    projectId: WALLETCONNECT_PROJECT_ID,
  }
);

export const config = createConfig({
  chains: [localDevnet],
  connectors,
  transports: {
    [localDevnet.id]: http(PUBLIC_CONFIG.RPC_URL),
  },
  multiInjectedProviderDiscovery: false,
  ssr: false,
});
