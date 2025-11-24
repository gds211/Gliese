import Navigation from "@/components/Navigation";
import cosmicBackground from "@/assets/cosmic-background.jpg";

import WormholeConnect, {
  type WormholeConnectConfig,
  type WormholeConnectPartialTheme,
} from "@wormhole-foundation/wormhole-connect";

const network =
  (import.meta.env.VITE_WORMHOLE_NETWORK as
    | "Mainnet"
    | "Testnet"
    | "Devnet"
    | undefined) ?? "Testnet";

const wormholeConfig: WormholeConnectConfig = {
  // Default to Testnet so you don't accidentally ship mainnet while iterating.
  network,
  // Optional: restrict which chains appear in the UI.
  // Leave this commented to use Wormhole's default list.
  // chains: ["Ethereum", "Solana", "Base", "Arbitrum"],
};

const wormholeTheme: WormholeConnectPartialTheme = {
  mode: "dark",
  background: {
    // Cosmic dark background to match your app
    default: "#020617", // roughly Tailwind slate-950
  },
};

const Bridge = () => {
  return (
    <div
      className="min-h-screen bg-black bg-cover bg-center text-white"
      style={{ backgroundImage: `url(${cosmicBackground})` }}
    >
      <div className="min-h-screen bg-black/80 backdrop-blur-sm">
        <Navigation />

        <main className="mx-auto flex max-w-5xl justify-center px-4 pb-12 pt-6 md:pt-10">
          <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-slate-950/80 shadow-2xl">
            <div className="border-b border-white/10 px-4 py-3 md:px-6 md:py-4">
              <h1 className="text-lg font-semibold md:text-xl">
                Cross-chain Bridge
              </h1>
              <p className="mt-1 text-xs text-zinc-300 md:text-sm">
                Bridge assets across chains using Wormhole Connect. Your wallet
                connection and transactions are handled securely by Wormhole.
              </p>
            </div>

            <div className="p-2 md:p-4">
              <WormholeConnect config={wormholeConfig} theme={wormholeTheme} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Bridge;
