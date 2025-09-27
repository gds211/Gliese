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
  const { blockNumber, error } = useLatestBlock(2000); // poll every 2s

  const dotClass = [
    "inline-block h-2.5 w-2.5 rounded-full",
    error ? "bg-red-500 animate-pulse" : "bg-white animate-pulse",
  ].join(" ");

  return (
    <div className="fixed left-6 bottom-4 z-50 pointer-events-none select-none">
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-2.5 py-1.5 backdrop-blur-sm">
        <span className={dotClass} />
        <span className="text-xs font-medium tabular-nums tracking-tight text-white/90">
          {blockNumber ? blockNumber.toString() : error ? "RPC error" : "—"}
        </span>
      </div>
    </div>
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

