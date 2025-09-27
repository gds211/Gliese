import Navigation from "@/components/Navigation";
import SwapInterface from "@/components/SwapInterface";
import cosmicBackground from "@/assets/cosmic-background.jpg";
import { useLatestBlock } from "@/hooks/useLatestBlock";

/**
 * Tiny bottom-left block-indicator (no footer).
 * - Blinks white.
 * - Shows the latest block number.
 * - Fixed to viewport bottom, horizontally aligned with the nav's px-6 (left-6).
 * - Pointer-events disabled so it never blocks clicks.
 */
function BlockIndicatorOverlay() {
  // poll every 10s
  const { blockNumber, error } = useLatestBlock(10_000);

  return (
    <>
      {/* local blink (no new css files) */}
      <style>{`
        @keyframes gliese-blink { 0%,49% { opacity: 1 } 50%,100% { opacity: .2 } }
        .gliese-blink { animation: gliese-blink 2s infinite steps(2, start); }
      `}</style>

      <div className="fixed left-6 bottom-4 z-50 pointer-events-none select-none">
        {/* no surrounding frame/pill — just the icon and the number */}
        <div className="flex items-center gap-2">
          {/* black circle with blinking white dot inside; red if RPC error */}
          <span className="relative inline-block h-4 w-4 rounded-full bg-black">
            <span
              className={`absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full gliese-blink ${
                error ? "bg-red-500" : "bg-white"
              }`}
            />
          </span>

          <span className="text-xs font-medium tabular-nums tracking-tight text-white/90">
            {blockNumber ? blockNumber.toString() : error ? "RPC error" : "—"}
          </span>
        </div>
      </div>
    </>
  );
}


const Index = () => {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Cosmic Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${cosmicBackground})` }}
      />

      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-background/20 backdrop-blur-[1px]" />

      {/* Content */}
      <div className="relative z-10">
        <Navigation />

        {/* Main Content Area */}
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <SwapInterface />
        </div>
      </div>

      {/* Fixed, tiny bottom indicator (no footer, aligned under the Gliese logo area) */}
      <BlockIndicatorOverlay />
    </div>
  );
};

export default Index;

