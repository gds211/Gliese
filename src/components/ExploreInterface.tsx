// src/components/ExploreInterface.tsx
import { useState } from "react";
import TimeframeSelector from "./Explore/TimeframeSelector";
import TokenTable from "./Explore/TokenTable";
import { useExploreFeed, type ExploreTimeframe } from "@/hooks/useExploreFeed";

export default function ExploreInterface() {
  const [chain, setChain] = useState("monad"); // Default chain
  const [timeframe, setTimeframe] = useState<ExploreTimeframe>("24h");

  // Fetch 1: New & Trending
  const trending = useExploreFeed({ 
    chain, timeframe, mode: "new_trending", limit: 20 
  });

  // Fetch 2: Top Traded
  const topTraded = useExploreFeed({ 
    chain, timeframe, mode: "top_traded", limit: 20 
  });

  return (
    <div className="flex flex-col h-full w-full gap-4 p-4 overflow-y-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-baseline gap-2">
            <h2 className="text-lg font-semibold text-white">Explore</h2>
            <span className="text-xs text-white/40 font-mono">LIVE</span>
        </div>
        <div className="flex items-center gap-4">
          <TimeframeSelector value={timeframe} onChange={setTimeframe} />
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
        
        {/* Panel 1: Trending */}
        <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/20 p-4 overflow-hidden shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
                <h3 className="text-sm font-medium text-emerald-400">New & Trending</h3>
                <p className="text-[10px] text-white/40">Movers filtered by security score</p>
            </div>
            {trending.isFetching && <span className="text-[10px] text-white/40 animate-pulse">Updating...</span>}
          </div>
          <TokenTable 
            items={trending.data?.items} 
            timeframe={timeframe} 
            isLoading={trending.isLoading} 
          />
        </div>

        {/* Panel 2: Top Traded */}
        <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-black/20 p-4 overflow-hidden shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
                <h3 className="text-sm font-medium text-blue-400">Top Traded</h3>
                <p className="text-[10px] text-white/40">Highest volume by timeframe</p>
            </div>
            {topTraded.isFetching && <span className="text-[10px] text-white/40 animate-pulse">Updating...</span>}
          </div>
          <TokenTable 
            items={topTraded.data?.items} 
            timeframe={timeframe} 
            isLoading={topTraded.isLoading} 
          />
        </div>

      </div>
    </div>
  );
}
