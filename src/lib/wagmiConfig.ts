import { createConfig, http } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { coinbaseWallet, metaMask, walletConnect } from 'wagmi/connectors'
import { monadChain } from './monadChain'

const projectId = 'YOUR_WALLETCONNECT_PROJECT_ID'

export const wagmiConfig = createConfig({
  chains: [mainnet, sepolia, monadChain],
  connectors: [
    metaMask(),
    coinbaseWallet({
      appName: 'Gliese',
    }),
    walletConnect({
      projectId,
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [monadChain.id]: http(),
  },
})