import { useState, useRef } from "react";
import { Search, Plus, ArrowUp, ArrowDown, ChevronLeft, Wallet } from "lucide-react";

type Pool = {
  id: number;
  pair: string;
  spread: string;
  category: "Tight" | "Moderate" | "Broad" | "Wide";
  tvl: string;
  volume: string;
  fees: string;
  apr: string;
  colorA: string;
  colorB: string;
  symbolA: string;
  symbolB: string;
};

const POOLS: Pool[] = [
  { id: 1, pair: "USDC/USDT", spread: "0.01%", category: "Tight", tvl: "$211.00M", volume: "$54.30M", fees: "$5.4K", apr: "9.4%", colorA: "from-blue-400 to-blue-600", colorB: "from-emerald-400 to-emerald-600", symbolA: "USDC", symbolB: "USDT" },
  { id: 2, pair: "ETH/USDC", spread: "0.05%", category: "Moderate", tvl: "$142.30M", volume: "$28.40M", fees: "$14.2K", apr: "36.5%", colorA: "from-indigo-400 to-purple-600", colorB: "from-blue-400 to-blue-600", symbolA: "ETH", symbolB: "USDC" },
  { id: 3, pair: "DAI/USDC", spread: "0.01%", category: "Tight", tvl: "$88.00M", volume: "$22.00M", fees: "$2.2K", apr: "9.1%", colorA: "from-amber-400 to-yellow-600", colorB: "from-blue-400 to-blue-600", symbolA: "DAI", symbolB: "USDC" },
  { id: 4, pair: "ETH/USDT", spread: "0.30%", category: "Moderate", tvl: "$98.70M", volume: "$19.10M", fees: "$57.3K", apr: "21.2%", colorA: "from-indigo-400 to-purple-600", colorB: "from-emerald-400 to-emerald-600", symbolA: "ETH", symbolB: "USDT" },
  { id: 5, pair: "WBTC/ETH", spread: "0.30%", category: "Broad", tvl: "$76.20M", volume: "$11.80M", fees: "$35.4K", apr: "16.9%", colorA: "from-orange-400 to-orange-600", colorB: "from-indigo-400 to-purple-600", symbolA: "WBTC", symbolB: "ETH" },
  { id: 6, pair: "MON/USDC", spread: "1.00%", category: "Wide", tvl: "$34.50M", volume: "$8.20M", fees: "$82.0K", apr: "86.7%", colorA: "from-fuchsia-400 to-purple-600", colorB: "from-blue-400 to-blue-600", symbolA: "MON", symbolB: "USDC" },
  { id: 7, pair: "ARB/USDC", spread: "0.05%", category: "Moderate", tvl: "$28.90M", volume: "$6.40M", fees: "$3.2K", apr: "12.3%", colorA: "from-sky-400 to-blue-600", colorB: "from-blue-400 to-blue-600", symbolA: "ARB", symbolB: "USDC" },
  { id: 8, pair: "SOL/USDT", spread: "0.30%", category: "Broad", tvl: "$45.10M", volume: "$14.70M", fees: "$44.1K", apr: "28.5%", colorA: "from-purple-400 to-fuchsia-600", colorB: "from-emerald-400 to-emerald-600", symbolA: "SOL", symbolB: "USDT" },
  { id: 9, pair: "LINK/ETH", spread: "0.30%", category: "Broad", tvl: "$22.60M", volume: "$4.30M", fees: "$12.9K", apr: "18.4%", colorA: "from-blue-500 to-indigo-700", colorB: "from-indigo-400 to-purple-600", symbolA: "LINK", symbolB: "ETH" },
  { id: 10, pair: "MATIC/USDC", spread: "0.05%", category: "Moderate", tvl: "$18.40M", volume: "$3.80M", fees: "$1.9K", apr: "10.7%", colorA: "from-violet-400 to-purple-600", colorB: "from-blue-400 to-blue-600", symbolA: "MATIC", symbolB: "USDC" },
];

const TokenPair = ({ colorA, colorB, symbolA, symbolB }: { colorA: string; colorB: string; symbolA: string; symbolB: string }) => (
  <div className="flex items-center -space-x-2">
    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${colorA} ring-2 ring-background flex items-center justify-center text-[10px] font-bold text-white`}>
      {symbolA.slice(0, 3)}
    </div>
    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${colorB} ring-2 ring-background flex items-center justify-center text-[10px] font-bold text-white`}>
      {symbolB.slice(0, 3)}
    </div>
  </div>
);

const PoolsInterface = () => {
  const [activeTab, setActiveTab] = useState<"all" | "my">("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<"tvl" | "volume" | "fees" | "apr" | null>("tvl");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");
  const inputARef = useRef<HTMLInputElement>(null);
  const inputBRef = useRef<HTMLInputElement>(null);

  const openAdd = (pool: Pool) => {
    setSelectedPool(pool);
    setAmountA("");
    setAmountB("");
  };
  const closeAdd = () => setSelectedPool(null);

  const filtered = POOLS.filter((p) => p.pair.toLowerCase().includes(search.toLowerCase()));

  const parseValue = (s: string) => {
    const cleaned = s.replace(/[$,%]/g, "");
    const m = cleaned.match(/^([\d.]+)([KMB]?)$/i);
    if (!m) return 0;
    const n = parseFloat(m[1]);
    const suffix = m[2].toUpperCase() as "K" | "M" | "B" | "";
    const mult: Record<string, number> = { K: 1e3, M: 1e6, B: 1e9, "": 1 };
    return n * mult[suffix];
  };

  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        const av = parseValue(a[sortKey]);
        const bv = parseValue(b[sortKey]);
        return sortDir === "desc" ? bv - av : av - bv;
      })
    : filtered;

  const handleSort = (key: "tvl" | "volume" | "fees" | "apr") => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("desc");
    } else {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    }
  };

  const SortHeader = ({ k, label }: { k: "tvl" | "volume" | "fees" | "apr"; label: string }) => {
    const active = sortKey === k;
    return (
      <button
        onClick={() => handleSort(k)}
        className={`flex items-center gap-1 transition-colors ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
      >
        {label}
        {active && (sortDir === "desc" ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />)}
      </button>
    );
  };

  if (selectedPool) {
    const ratioA = 57.1;
    const ratioB = 42.9;
    return (
      <div className="relative w-full h-[calc(100vh-65px)] overflow-hidden z-20" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>
        <div className="absolute inset-0 bg-white/10 backdrop-blur-xl" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, transparent 70%)" }}
        />
        {/* Back button - far left of viewport, aligned with title row */}
        <button
          onClick={closeAdd}
          className="absolute left-[calc(50%-550px-200px)] top-[34px] z-20 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <div className="relative z-10 px-8 pt-8 pb-8 max-w-[1100px] mx-auto h-full overflow-y-auto no-scrollbar">
          {/* Title row aligned with panel start */}
          <div className="flex items-center gap-3 mb-6">
            <TokenPair colorA={selectedPool.colorA} colorB={selectedPool.colorB} symbolA={selectedPool.symbolA} symbolB={selectedPool.symbolB} />
            <h1 className="text-2xl text-foreground">{selectedPool.pair}</h1>
            <span className="text-xs font-medium px-2 py-0.5 rounded-sm bg-white/10 text-foreground">
              {selectedPool.category}
            </span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-sm bg-primary/15 text-primary">
              {selectedPool.spread}
            </span>
          </div>

          {/* Pool Composition */}
          <div className="rounded-2xl border border-white/10 p-6 mb-4" style={{ backgroundColor: "#262626" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base text-foreground">Pool Composition</h2>
              <span className="text-sm text-muted-foreground">Flexible Ratio</span>
            </div>
            <div className="relative flex w-full h-10 gap-1.5">
              <div
                className="flex items-center justify-start pl-3 text-xs font-semibold text-white bg-yellow-300 rounded-lg"
                style={{ width: `calc(${ratioA}% - 0.375rem)` }}
              >
                {ratioA}% {selectedPool.symbolA}
              </div>
              <div
                className="flex items-center justify-end pr-3 text-xs font-semibold text-white bg-sky-500 rounded-lg"
                style={{ width: `calc(${ratioB}% - 0.375rem)` }}
              >
                {ratioB}% {selectedPool.symbolB}
              </div>
              <div
                className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0 pointer-events-none"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(to bottom, white 0 6px, transparent 6px 12px)",
                  width: "3px",
                }}
              />
            </div>
          </div>

          {/* Add Liquidity */}
          <div className="flex justify-end">
          <div className="w-[60%] rounded-2xl border border-white/10 p-[26px] py-[24px]" style={{ backgroundColor: "#262626" }}>
            <h2 className="text-base text-foreground -mt-3 mb-6">Add Liquidity</h2>

            {/* Token A input */}
            <div onClick={() => inputARef.current?.focus()} className="rounded-xl border border-white/10 bg-muted/20 px-4 py-6 cursor-text">
              <div className="flex items-center justify-end gap-2 mb-6">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Wallet className="w-3.5 h-3.5" />
                  0.00 {selectedPool.symbolA}
                </div>
                <button className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/10 text-foreground hover:bg-white/20 transition-colors">
                  HALF
                </button>
                <button className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/10 text-foreground hover:bg-white/20 transition-colors">
                  MAX
                </button>
              </div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${selectedPool.colorA} flex items-center justify-center text-[10px] font-bold text-white`}>
                    {selectedPool.symbolA.slice(0, 3)}
                  </div>
                  <span className="text-2xl text-foreground leading-none">{selectedPool.symbolA}</span>
                </div>
                <div className="flex flex-col items-end justify-center">
                  <input
                    ref={inputARef}
                    type="text"
                    inputMode="decimal"
                    value={amountA}
                    onChange={(e) => setAmountA(e.target.value)}
                    placeholder="0.00"
                    className="bg-transparent text-2xl text-foreground text-right outline-none w-40 placeholder:text-muted-foreground leading-tight"
                  />
                  <span className="text-xs text-muted-foreground mt-0.5">$0.00</span>
                </div>
              </div>
            </div>

            {/* Plus divider */}
            <div className="relative flex justify-center -my-3 z-10">
              <div className="w-8 h-8 rounded-full bg-primary/20 border-4 flex items-center justify-center" style={{ borderColor: "#262626" }}>
                <Plus className="w-4 h-4 text-primary" />
              </div>
            </div>

            {/* Token B input */}
            <div onClick={() => inputBRef.current?.focus()} className="rounded-xl border border-white/10 bg-muted/20 px-4 py-6 mb-3 cursor-text">
              <div className="flex items-center justify-end gap-2 mb-6">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Wallet className="w-3.5 h-3.5" />
                  0.00 {selectedPool.symbolB}
                </div>
                <button className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/10 text-foreground hover:bg-white/20 transition-colors">
                  HALF
                </button>
                <button className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/10 text-foreground hover:bg-white/20 transition-colors">
                  MAX
                </button>
              </div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${selectedPool.colorB} flex items-center justify-center text-[10px] font-bold text-white`}>
                    {selectedPool.symbolB.slice(0, 3)}
                  </div>
                  <span className="text-2xl text-foreground leading-none">{selectedPool.symbolB}</span>
                </div>
                <div className="flex flex-col items-end justify-center">
                  <input
                    ref={inputBRef}
                    type="text"
                    inputMode="decimal"
                    value={amountB}
                    onChange={(e) => setAmountB(e.target.value)}
                    placeholder="0.00"
                    className="bg-transparent text-2xl text-foreground text-right outline-none w-40 placeholder:text-muted-foreground leading-tight"
                  />
                  <span className="text-xs text-muted-foreground mt-0.5">$0.00</span>
                </div>
              </div>
            </div>

            <button className="w-full py-3 mt-0 rounded-xl bg-white text-black text-base font-semibold hover:bg-white/90 transition-colors">
              Add Liquidity
            </button>
          </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[calc(100vh-65px)] overflow-hidden z-20" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>
      {/* Frosted Glass Effect - highly transparent with strong blur */}
      <div className="absolute inset-0 bg-white/10 backdrop-blur-xl" />

      {/* Radial darkening to reduce center brightness */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, transparent 70%)" }}
      />

      {/* Content */}
      <div className="relative z-10 px-8 pt-8 pb-0 max-w-[1800px] mx-auto h-full flex flex-col">
        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-3xl text-foreground">Liquidity Pools</h1>
            <p className="text-sm text-muted-foreground mt-1">Provide liquidity and earn trading fees</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search pools..."
                className="pl-10 pr-4 py-2.5 w-72 rounded-lg bg-muted/40 backdrop-blur-md border border-white/10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white text-black text-sm hover:bg-white/90 transition-colors">
              <Plus className="w-4 h-4" />
              New Pool
            </button>
          </div>
        </div>

        {/* Pools Table Card */}
        <div className="rounded-2xl border border-white/10 overflow-hidden flex-1 min-h-0 flex flex-col" style={{ backgroundColor: "#131313" }}>
          {/* Tabs */}
          <div className="flex items-center gap-6 px-6 pt-4 border-b border-white/10 flex-shrink-0" style={{ backgroundColor: "#1A1A1A" }}>
            <button
              onClick={() => setActiveTab("all")}
              className={`pb-3 text-base transition-colors relative ${
                activeTab === "all" ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Pools
              {activeTab === "all" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("my")}
              className={`pb-3 text-base transition-colors relative ${
                activeTab === "my" ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              My Positions
              {activeTab === "my" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-[40px_2fr_1fr_1fr_1fr_1fr_1fr_120px] items-center gap-4 px-6 py-3 text-xs tracking-wider text-muted-foreground border-b border-white/5 flex-shrink-0" style={{ backgroundColor: "#1A1A1A" }}>
            <div>#</div>
            <div>Pool</div>
            <div>Spread</div>
            <SortHeader k="tvl" label="TVL" />
            <SortHeader k="volume" label="Volume 24H" />
            <SortHeader k="fees" label="Fees 24H" />
            <SortHeader k="apr" label="APR 24H" />
            <div></div>
          </div>

          {/* Table Rows */}
          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
            {sorted.map((pool, idx) => (
              <div
                key={pool.id}
                className="grid grid-cols-[40px_2fr_1fr_1fr_1fr_1fr_1fr_120px] items-center gap-4 px-6 py-4 border-b border-white/5 last:border-b-0 hover:bg-white/5 transition-colors"
              >
                <div className="text-base text-muted-foreground">{idx + 1}</div>
                <div className="flex items-center gap-3">
                  <TokenPair colorA={pool.colorA} colorB={pool.colorB} symbolA={pool.symbolA} symbolB={pool.symbolB} />
                  <span className="text-base text-foreground">{pool.pair}</span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-primary/15 text-primary">
                    {pool.spread}
                  </span>
                </div>
                <div className="text-base text-foreground">{pool.category}</div>
                <div className="text-base text-foreground">{pool.tvl}</div>
                <div className="text-base text-foreground">{pool.volume}</div>
                <div className="text-base text-foreground">{pool.fees}</div>
                <div className="text-base text-foreground">{pool.apr}</div>
                <div className="flex justify-end">
                  <button
                    onClick={() => openAdd(pool)}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary/15 text-primary text-base hover:bg-primary/25 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PoolsInterface;