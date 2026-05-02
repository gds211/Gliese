import { useState } from "react";
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

const SingleToken = ({ color, symbol }: { color: string; symbol: string }) => (
  <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-[10px] font-bold text-white`}>
    {symbol.slice(0, 3)}
  </div>
);

const AddLiquidityView = ({ pool, onBack }: { pool: Pool; onBack: () => void }) => {
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");

  // Mocked ratio derived from the pool spread index — purely visual
  const pctA = 57.1;
  const pctB = 42.9;
  const ratio = pctB / pctA; // amountB per amountA

  const handleA = (v: string) => {
    setAmountA(v);
    const n = parseFloat(v);
    setAmountB(isNaN(n) ? "" : (n * ratio).toFixed(4).replace(/\.?0+$/, ""));
  };
  const handleB = (v: string) => {
    setAmountB(v);
    const n = parseFloat(v);
    setAmountA(isNaN(n) ? "" : (n / ratio).toFixed(4).replace(/\.?0+$/, ""));
  };

  const TokenInputRow = ({
    color,
    symbol,
    value,
    onChange,
  }: {
    color: string;
    symbol: string;
    value: string;
    onChange: (v: string) => void;
  }) => (
    <div className="rounded-xl bg-muted/40 backdrop-blur-md border border-white/10 p-4">
      <div className="flex items-center justify-end gap-2 mb-3">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 text-xs text-muted-foreground">
          <Wallet className="w-3 h-3" />
          0.00 {symbol}
        </div>
        <button
          onClick={() => onChange("0")}
          className="px-2 py-1 rounded-md bg-primary/15 text-primary text-[10px] font-semibold tracking-wider hover:bg-primary/25 transition-colors"
        >
          HALF
        </button>
        <button
          onClick={() => onChange("0")}
          className="px-2 py-1 rounded-md bg-primary/15 text-primary text-[10px] font-semibold tracking-wider hover:bg-primary/25 transition-colors"
        >
          MAX
        </button>
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SingleToken color={color} symbol={symbol} />
          <span className="text-lg text-foreground">{symbol}</span>
        </div>
        <div className="flex flex-col items-end">
          <input
            type="text"
            inputMode="decimal"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="0.00"
            className="bg-transparent text-right text-2xl text-foreground placeholder:text-muted-foreground focus:outline-none w-40"
          />
          <span className="text-xs text-muted-foreground mt-0.5">$0.00</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative z-10 px-8 pt-6 pb-0 max-w-[1400px] mx-auto h-full flex flex-col">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 self-start"
      >
        <ChevronLeft className="w-4 h-4" />
        Back
      </button>

      <div className="flex items-center gap-3 mb-6">
        <TokenPair colorA={pool.colorA} colorB={pool.colorB} symbolA={pool.symbolA} symbolB={pool.symbolB} />
        <h1 className="text-2xl text-foreground">Add liquidity to {pool.pair}</h1>
        <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-primary/15 text-primary">
          {pool.spread}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0">
        {/* Pool Composition */}
        <div className="rounded-2xl border border-white/10 p-6 h-fit" style={{ backgroundColor: "#131313" }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg text-foreground">Pool Composition</h2>
            <span className="text-sm text-muted-foreground">Flexible Ratio</span>
          </div>
          <div className="flex w-full h-12 rounded-lg overflow-hidden border border-white/10">
            <div
              className={`bg-gradient-to-br ${pool.colorA} flex items-center justify-center text-xs font-semibold text-white`}
              style={{ width: `${pctA}%` }}
            >
              {pctA}% {pool.symbolA}
            </div>
            <div
              className={`bg-gradient-to-br ${pool.colorB} flex items-center justify-center text-xs font-semibold text-white`}
              style={{ width: `${pctB}%` }}
            >
              {pctB}% {pool.symbolB}
            </div>
          </div>
        </div>

        {/* Add Liquidity */}
        <div className="rounded-2xl border border-white/10 p-6 flex flex-col gap-4" style={{ backgroundColor: "#131313" }}>
          <h2 className="text-lg text-foreground">Add Liquidity</h2>
          <TokenInputRow
            color={pool.colorA}
            symbol={pool.symbolA}
            value={amountA}
            onChange={handleA}
          />
          <TokenInputRow
            color={pool.colorB}
            symbol={pool.symbolB}
            value={amountB}
            onChange={handleB}
          />
          <button className="mt-2 w-full py-3 rounded-lg bg-white text-black text-sm hover:bg-white/90 transition-colors">
            Add Liquidity
          </button>
        </div>
      </div>
    </div>
  );
};

const PoolsInterface = () => {
  const [activeTab, setActiveTab] = useState<"all" | "my">("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<"tvl" | "volume" | "fees" | "apr" | null>("tvl");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);

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

  return (
    <div className="relative w-full h-[calc(100vh-65px)] overflow-hidden z-20" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>
      {/* Frosted Glass Effect - highly transparent with strong blur */}
      <div className="absolute inset-0 bg-white/10 backdrop-blur-xl" />

      {/* Radial darkening to reduce center brightness */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, transparent 70%)" }}
      />

      {selectedPool ? (
        <AddLiquidityView pool={selectedPool} onBack={() => setSelectedPool(null)} />
      ) : (
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
                    onClick={() => setSelectedPool(pool)}
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
      )}
    </div>
  );
};

export default PoolsInterface;