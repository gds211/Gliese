Gliese
Gliese is a React and TypeScript web application prototype for exploring wallet-based token swaps through a YakRouter smart contract.
The project focuses on the user interface, blockchain integration, quote updates and the transaction workflow.

Tech stack:
- React and TypeScript
- Vite
- Tailwind CSS and shadcn/ui
- wagmi and viem
- RainbowKit and TanStack Query
Current implementation
- Browser wallet connection and token balance display.
- Token selection and search.
- Swap quotes requested from YakRouter.
- ERC-20 allowance checks and approval transactions when required.
- Swap simulation before submission, followed by receipt waiting.
- Automatic slippage calculation based on quote changes and trade size.
- Shared block watching and token metadata caching.
  
Development setup
Install Node.js and npm, then run:
git clone https://github.com/gds211/Gliese.git
cd Gliese
npm ci
npm run dev

These commands start the frontend. Blockchain features additionally require a reachable EVM node, a compatible YakRouter deployment, the relevant token contracts and a browser wallet configured for the same network.
Network settings and contract addresses are defined in src/config/public.ts. The current configuration uses local chain ID 31337 and RPC URL https://127.0.0.1:8546. Configure these values and the router and wrapped-native-token addresses for your own development environment. Wallet configuration is in src/config/wagmi.ts.
Local node setup, Solidity source files and contract deployment scripts are not included in this repository.
Project structure
Location	Purpose
src/components/SwapInterface.tsx	Swap interface and user interaction
src/hooks/useYakQuote.ts	Quote requests and updates
src/hooks/useDynamicSlippage.ts	Automatic slippage calculation
src/lib/swap.ts	Approval and swap transaction workflow
src/lib/sharedBlockWatcher.ts	Shared blockchain subscription
src/abi/	Contract interfaces
src/config/	Application and network configuration


Current limitations
- This is a development prototype.
- Pool statistics currently use sample data, and liquidity transaction actions are not implemented.
- Trigger order creation is not implemented.
- Some labels and transaction links still refer to Monad testnet and need to match the chosen network.
- An automated test suite has not yet been added.
