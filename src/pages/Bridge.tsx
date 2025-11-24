import Navigation from "@/components/Navigation";
import { Card } from "@/components/ui/card";
import cosmicBackground from "@/assets/cosmic-background.jpg";
import WormholeConnect, {
  type config,
  WormholeConnectTheme,
} from "@wormhole-foundation/wormhole-connect";
import { WALLETCONNECT_PROJECT_ID } from "@/config/public";

/**
 * Wormhole Connect configuration for bridging between Ethereum and Monad.
 * - Uses Mainnet by default.
 * - Restricts chains to Ethereum and Monad to keep the UI focused.
 * - Prefills the UI with Ethereum → Monad as the default route.
 *
 * Chains & RPC config follow Wormhole + Monad docs:
 * - Wormhole Connect chains: Ethereum, Monad, etc. :contentReference[oaicite:1]{index=1}
 * - Monad mainnet RPC: https://rpc.monad.xyz :contentReference[oaicite:2]{index=2}
 */
const wormholeConfig: config.WormholeConnectConfig = {
  network: "Mainnet",
  chains: ["Ethereum", "Monad"],
  rpcs: {
    Ethereum: "https://rpc.ankr.com/eth",
    // Monad mainnet public RPC (you can swap for your infra provider if needed)
    Monad: "https://rpc.monad.xyz",
  },
  ui: {
    title: "Bridge assets with Wormhole",
    defaultInputs: {
      fromChain: "Ethereum",
      toChain: "Monad",
    },
  },
  // Reuse your existing WalletConnect project ID so Connect can show
  // the same wallet provider your app already uses.
  // Doc ref: `walletConnectProjectId` config. :contentReference[oaicite:3]{index=3}
  walletConnectProjectId: WALLETCONNECT_PROJECT_ID,
};

const wormholeTheme: WormholeConnectTheme = {
  mode: "dark",
  // Accent color for the widget – roughly Tailwind's emerald-500.
  primary: "#22c55e",
};

const Bridge = () => {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Cosmic background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${cosmicBackground})` }}
      />
      {/* Slight dark overlay for readability */}
      <div className="absolute inset-0 bg-background/20 backdrop-blur-[1px]" />

      <div className="relative z-10">
        <Navigation />

        {/* Centered bridge card */}
        <div className="flex justify-center items-start pt-[calc(50vh-320px)] min-h-[calc(100vh-80px)] px-4 pb-10">
          <Card className="w-full max-w-[880px] mx-auto bg-muted/40 backdrop-blur-md border border-muted/60 shadow-2xl">
            <div className="p-4 sm:p-6">
              <WormholeConnect config={wormholeConfig} theme={wormholeTheme} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Bridge;
