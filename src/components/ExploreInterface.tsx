// src/components/ExploreInterface.tsx
import { useState, useMemo } from "react";
import { Search, Filter, RefreshCw, X, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import TimeframeSelector from "./Explore/TimeframeSelector";
import ExploreSidebar, { type ExploreView } from "./Explore/ExploreSidebar";
import TokenListItem from "./Explore/TokenListItem";
import TokenDetailsPanel from "./Explore/TokenDetailsPanel";
import { useExploreFeed, type ExploreTimeframe, type ExploreToken } from "@/hooks/useExploreFeed";
import { useIsMobile } from "@/hooks/use-mobile";

export default function ExploreInterface() {
  const isMobile = useIsMobile();
  const [chain] = useState("monad");
  const [timeframe, setTimeframe] = useState<ExploreTimeframe>("24h");
  const [activeView, setActiveView] = useState<ExploreView>("trending");
  const [selectedToken, setSelectedToken] = useState<ExploreToken | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Map view to API mode
  const mode = useMemo(() => {
    if (activeView === "top_traded") return "top_traded" as const;
    return "new_trending" as const;
  }, [activeView]);

  const { data, isLoading, isFetching, refetch } = useExploreFeed({
    chain,
    timeframe,
    mode,
    limit: 50,
  });

  // Filter tokens by search
  const filteredTokens = useMemo(() => {
    if (!data?.items) return [];
    if (!searchQuery.trim()) return data.items;
    const q = searchQuery.toLowerCase();
    return data.items.filter(
      (t) =>
        t.tokenSymbol?.toLowerCase().includes(q) ||
        t.tokenName?.toLowerCase().includes(q) ||
        t.tokenAddress?.toLowerCase().includes(q)
    );
  }, [data?.items, searchQuery]);

  const handleTokenSelect = (token: ExploreToken) => {
    setSelectedToken(token);
    if (isMobile) {
      setDetailsOpen(true);
    }
  };

  // Glass container base styles
  const glassBase = "bg-black/40 backdrop-blur-2xl border border-white/10";

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Dark background overlay */}
      <div className="absolute inset-0 bg-[#0a0a0c]" />

      {/* Mobile Sidebar Overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        >
          <div 
            className={cn(glassBase, "w-64 h-full animate-in slide-in-from-left")}
            onClick={(e) => e.stopPropagation()}
          >
            <ExploreSidebar 
              activeView={activeView} 
              onViewChange={(v) => { setActiveView(v); setSidebarOpen(false); }}
            />
          </div>
        </div>
      )}

      {/* Mobile Details Panel */}
      {isMobile && detailsOpen && selectedToken && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setDetailsOpen(false)}
        >
          <div 
            className={cn(glassBase, "absolute right-0 top-0 h-full w-[90%] max-w-md animate-in slide-in-from-right")}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setDetailsOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4 text-white/60" />
            </button>
            <TokenDetailsPanel token={selectedToken} timeframe={timeframe} />
          </div>
        </div>
      )}

      {/* Main Layout */}
      <div className="relative z-10 flex w-full h-full p-2 gap-2">
        
        {/* Left Sidebar - Desktop */}
        {!isMobile && (
          <aside className={cn(glassBase, "w-52 shrink-0 rounded-2xl overflow-hidden")}>
            <ExploreSidebar activeView={activeView} onViewChange={setActiveView} />
          </aside>
        )}

        {/* Middle Column - Main List */}
        <main className={cn(glassBase, "flex-1 flex flex-col rounded-2xl overflow-hidden min-w-0")}>
          {/* Header */}
          <div className="shrink-0 p-4 border-b border-white/5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {isMobile && (
                  <button 
                    onClick={() => setSidebarOpen(true)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <Menu className="w-5 h-5 text-white/70" />
                  </button>
                )}
                <div>
                  <h1 className="text-xl font-bold text-white">
                    {activeView === "trending" && "🔥 Trending"}
                    {activeView === "top_traded" && "📊 Top Traded"}
                    {activeView === "gainers" && "📈 Top Gainers"}
                    {activeView === "new" && "🆕 New Tokens"}
                    {activeView === "watchlist" && "⭐ Watchlist"}
                  </h1>
                  <p className="text-xs text-white/40">
                    {filteredTokens.length} tokens on Monad
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TimeframeSelector value={timeframe} onChange={setTimeframe} />
                <button
                  onClick={() => refetch()}
                  disabled={isFetching}
                  className={cn(
                    "p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all",
                    isFetching && "animate-spin"
                  )}
                >
                  <RefreshCw className="w-4 h-4 text-white/60" />
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <Input
                type="text"
                placeholder="Search tokens..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl focus:border-emerald-500/50 focus:ring-emerald-500/20"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-white/10"
                >
                  <X className="w-3 h-3 text-white/40" />
                </button>
              )}
            </div>
          </div>

          {/* Table Header */}
          <div className="shrink-0 flex items-center px-4 py-2 bg-black/30 border-b border-white/5 text-[10px] text-white/40 uppercase tracking-wider font-semibold">
            <span className="w-6 text-center">#</span>
            <span className="flex-1 ml-3">Token</span>
            <span className="w-[50px] hidden sm:block text-center">Trend</span>
            <span className="w-24 text-right">Price</span>
            <span className="w-20 text-right">Change</span>
            <span className="w-20 text-right hidden md:block">Volume</span>
            <span className="w-16" />
          </div>

          {/* Token List */}
          <ScrollArea className="flex-1">
            {isLoading ? (
              <div className="p-4 space-y-2">
                {Array(12).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full bg-white/5 rounded-lg" />
                ))}
              </div>
            ) : filteredTokens.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <p className="text-white/40 text-sm">No tokens found</p>
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery("")}
                    className="mt-2 text-xs text-emerald-400 hover:underline"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <div>
                {filteredTokens.map((token, index) => (
                  <TokenListItem
                    key={token.tokenAddress}
                    token={token}
                    timeframe={timeframe}
                    rank={index + 1}
                    isSelected={selectedToken?.tokenAddress === token.tokenAddress}
                    onClick={() => handleTokenSelect(token)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          <div className="shrink-0 px-4 py-3 border-t border-white/5 flex items-center justify-between bg-black/20">
            <span className="text-[10px] text-white/30">
              Data from Moralis • Updates every 30s
            </span>
            {isFetching && !isLoading && (
              <span className="text-[10px] text-emerald-400 animate-pulse">Updating...</span>
            )}
          </div>
        </main>

        {/* Right Panel - Details (Desktop Only) */}
        {!isMobile && (
          <aside className={cn(glassBase, "w-80 shrink-0 rounded-2xl overflow-hidden")}>
            <TokenDetailsPanel token={selectedToken} timeframe={timeframe} />
          </aside>
        )}
      </div>
    </div>
  );
}
