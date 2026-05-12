import { useState, useRef, Fragment } from "react";
import { Search, Plus, ArrowUp, ArrowDown, ChevronLeft, Wallet, Info, ChevronDown, Loader2, Pencil, Check } from "lucide-react";
import TopLoadingBar from "@/components/TopLoadingBar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogOverlay } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import TokenAvatar from "@/components/TokenAvatar";
import { useAccount } from "wagmi";
import { Address } from "viem";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { useTokenSearch } from "@/hooks/useTokenSearch";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { formatBalanceWithScale } from "@/lib/utils";
import verifiedBadge from "@/assets/verified-badge.svg";

function formatAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
}

const TokenBalanceDisplay = ({
  tokenAddress,
  walletAddress,
}: {
  tokenAddress?: Address;
  walletAddress?: Address;
}) => {
  const { formatted, isLoading } = useTokenBalance({
    address: walletAddress,
    token: tokenAddress,
  });
  if (!walletAddress) return <span className="text-xs text-white font-medium tabular-nums">0.0000</span>;
  if (isLoading) return <span className="text-xs text-white font-medium tabular-nums">...</span>;
  return (
    <span className="text-xs text-white font-medium tabular-nums">
      {formatted ? formatBalanceWithScale(parseFloat(formatted)) : "0.0000"}
    </span>
  );
};

type PoolToken = {
  symbol: string;
  name?: string;
  address?: `0x${string}`;
};

const POOL_TOKENS: PoolToken[] = [
  { symbol: "MON", name: "monad" },
  { symbol: "USDC", name: "Circle USD", address: "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea" },
  { symbol: "USDT", name: "Tether USD", address: "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D" },
  { symbol: "CHOG", name: "chog", address: "0xE0590015A873bF326bd645c3E1266d4db41C4E6B" },
  { symbol: "DAK", name: "Molandak", address: "0x0F0BDEbF0F83cD1EE3974779Bcb7315f9808c714" },
  { symbol: "aprMON", name: "apriori MON", address: "0xb2f82D0f38dc453D596Ad40A37799446Cc89274A" },
  { symbol: "WMON", name: "Wrapped Monad", address: "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701" },
  { symbol: "gMON", name: "gMON", address: "0xaEef2f6B429Cb59C9B2D7bB2141ADa993E8571c3" },
  { symbol: "shMON", name: "ShMonad", address: "0x3a98250F98Dd388C211206983453837C8365BDc1" },
  { symbol: "YAKI", name: "Moyaki", address: "0xfe140e1dCe99Be9F4F15d657CD9b7BF622270C50" },
  { symbol: "WETH", name: "Wrapped ETH", address: "0xB5a30b0FDc5EA94A52fDc42e3E9760Cb8449Fb37" },
  { symbol: "WBTC", name: "Wrapped BTC", address: "0xcf5a6076cfa32686c0Df13aBaDa2b40dec133F1d" },
];

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
  const [pendingPool, setPendingPool] = useState<Pool | null>(null);
  const [pendingClose, setPendingClose] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showNewPool, setShowNewPool] = useState(false);
  const [pendingNewPool, setPendingNewPool] = useState(false);
  const [pendingCloseNewPool, setPendingCloseNewPool] = useState(false);
  const [baseToken, setBaseToken] = useState<PoolToken | null>(null);
  const [quoteToken, setQuoteToken] = useState<PoolToken | null>(null);
  const [tokenPickerOpen, setTokenPickerOpen] = useState(false);
  const [tokenPickerTarget, setTokenPickerTarget] = useState<"base" | "quote">("base");
  const [tokenSearch, setTokenSearch] = useState("");
  const [newPoolStep, setNewPoolStep] = useState<1 | 2 | 3>(1);
  const [feeTier, setFeeTier] = useState<"Tight" | "Moderate" | "Broad" | "Wide">("Broad");
  const [priceInverted, setPriceInverted] = useState(false);
  const [initialPrice, setInitialPrice] = useState("0.491985");
  const inputARef = useRef<HTMLInputElement>(null);
  const inputBRef = useRef<HTMLInputElement>(null);
  const { address: walletAddress } = useAccount();
  const debouncedTokenSearch = useDebouncedValue(tokenSearch, 250);
  const { data: tokenSearchResults = [], isLoading: tokenSearching } = useTokenSearch(debouncedTokenSearch);

  const openTokenPicker = (target: "base" | "quote") => {
    setTokenPickerTarget(target);
    setTokenSearch("");
    setTokenPickerOpen(true);
  };

  const handleSelectToken = (t: PoolToken) => {
    if (tokenPickerTarget === "base") setBaseToken(t);
    else setQuoteToken(t);
    setTokenPickerOpen(false);
  };

  const isVerifiedPoolToken = (t: { symbol: string; address?: `0x${string}` }) =>
    POOL_TOKENS.some((p) => {
      if (p.address && t.address) return p.address.toLowerCase() === t.address.toLowerCase();
      if (!p.address && !t.address) return p.symbol.toUpperCase() === t.symbol.toUpperCase();
      return false;
    });

  const filteredPoolTokens: PoolToken[] = (() => {
    const q = tokenSearch.trim().toLowerCase();
    if (!q) return POOL_TOKENS;
    const local = POOL_TOKENS.filter(
      (t) =>
        t.symbol.toLowerCase().includes(q) ||
        (t.name || "").toLowerCase().includes(q) ||
        (t.address || "").toLowerCase().includes(q)
    );
    const seen = new Set<string>(
      local.map((t) => (t.address ? `a:${t.address.toLowerCase()}` : `s:${t.symbol.toUpperCase()}`))
    );
    const remote: PoolToken[] = [];
    for (const r of tokenSearchResults as any[]) {
      const key = r.address ? `a:${r.address.toLowerCase()}` : `s:${(r.symbol || "").toUpperCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      remote.push({ symbol: r.symbol || "", name: r.name, address: r.address });
    }
    return [...local, ...remote];
  })();

  const openAdd = (pool: Pool) => {
    setPendingPool(pool);
    setIsLoading(true);
  };
  const closeAdd = () => {
    setPendingClose(true);
    setIsLoading(true);
  };

  const openNewPool = () => {
    setPendingNewPool(true);
    setIsLoading(true);
  };
  const closeNewPool = () => {
    setPendingCloseNewPool(true);
    setIsLoading(true);
  };

  const handleLoadingComplete = () => {
    if (pendingPool) {
      setSelectedPool(pendingPool);
      setAmountA("");
      setAmountB("");
      setPendingPool(null);
    }
    if (pendingClose) {
      setSelectedPool(null);
      setPendingClose(false);
    }
    if (pendingNewPool) {
      setShowNewPool(true);
      setNewPoolStep(1);
      setPendingNewPool(false);
    }
    if (pendingCloseNewPool) {
      setShowNewPool(false);
      setNewPoolStep(1);
      setPendingCloseNewPool(false);
    }
    setIsLoading(false);
  };

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

  if (showNewPool) {
    return (
      <div className="relative w-full h-[calc(100vh-65px)] overflow-hidden z-20" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>
        <TopLoadingBar isLoading={isLoading} onComplete={handleLoadingComplete} duration={400} />
        <div className="absolute inset-0 bg-white/10 backdrop-blur-xl" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, transparent 70%)" }}
        />
          <div className="relative z-10 px-6 pt-8 pb-8 max-w-[1740px] mx-auto h-full overflow-y-auto no-scrollbar">
            <div className="grid grid-cols-[442px_708px_442px] gap-x-[48px] gap-y-0 justify-center items-stretch">
            {/* Back button aligned with steps panel left edge */}
            <button
              onClick={closeNewPool}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 self-start translate-y-12"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
            <div aria-hidden="true" />
            <div aria-hidden="true" />

            {/* Steps column - fixed height, does not stretch with form */}
            <div className="flex flex-col self-start">
              {/* Invisible heading to align panel top with card top */}
              <h2 className="text-lg font-medium mb-4 invisible">.</h2>
              <div className="rounded-2xl border border-white/10 p-5 flex flex-col relative" style={{ backgroundColor: "#262626" }}>
                {[
                  { n: 1, label: "Select tokens" },
                  { n: 2, label: "Set initial price & spread" },
                  { n: 3, label: "Enter deposit amount" },
                ].map((s, i) => {
                  const active = newPoolStep === s.n;
                  const completed = newPoolStep > s.n;
                  return (
                    <Fragment key={s.n}>
                      <div
                        className={`shrink-0 rounded-xl px-4 py-4 ${active ? "bg-primary/10 border border-primary/30" : ""}`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-semibold ${
                              active
                                ? "border-primary bg-primary/20 text-primary"
                                : completed
                                ? "border-white/20 bg-white/20 text-muted-foreground"
                                : "border-white/20 text-muted-foreground"
                            }`}
                          >
                            {completed ? (
                              <Check className="w-4 h-4" strokeWidth={3} style={{ color: "#262626" }} />
                            ) : (
                              s.n
                            )}
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Step {s.n}</div>
                            <div className={`text-sm font-medium ${active ? "text-primary" : "text-foreground"}`}>
                              {s.label}
                            </div>
                          </div>
                        </div>
                      </div>
                      {i < 2 && (
                        <div className="flex flex-col items-start justify-center h-9">
                          <div className="ml-[31px] w-px h-full bg-white/15" />
                        </div>
                      )}
                    </Fragment>
                  );
                })}
              </div>
            </div>

            {/* Form column - page-centered */}
            <div>
              <h2 className="text-lg text-foreground font-medium mb-4">
                {newPoolStep === 1
                  ? "First, select tokens"
                  : "Next, set initial token price & position price range"}
              </h2>
              {newPoolStep > 1 && (
                <div
                  className="rounded-2xl border border-white/10 px-5 py-4 mb-4 flex items-center justify-between"
                  style={{ backgroundColor: "#262626" }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center -space-x-2">
                      {baseToken && (
                        <div className="ring-2 ring-[#262626] rounded-full">
                          <TokenAvatar symbol={baseToken.symbol} address={baseToken.address} size={24} />
                        </div>
                      )}
                      {quoteToken && (
                        <div className="ring-2 ring-[#262626] rounded-full">
                          <TokenAvatar symbol={quoteToken.symbol} address={quoteToken.address} size={24} />
                        </div>
                      )}
                    </div>
                    <span className="text-base text-foreground font-medium">
                      {baseToken?.symbol} / {quoteToken?.symbol}
                    </span>
                    <span className="text-xs text-primary bg-primary/10 border border-primary/30 rounded-full px-2.5 py-1">
                      Fee 0.1%
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewPoolStep(1)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Edit tokens"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              )}
              {newPoolStep === 1 && (
              <div className="rounded-2xl border border-white/10 p-6" style={{ backgroundColor: "#262626" }}>
                <div className="text-sm text-foreground font-medium mb-3">Tokens</div>
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <button
                    type="button"
                    onClick={() => openTokenPicker("base")}
                    className="text-left rounded-xl border border-white/10 bg-muted/20 px-4 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="text-xs text-muted-foreground mb-2">Base token</div>
                    <div className="flex items-center justify-between w-full">
                      {baseToken ? (
                        <span className="flex items-center gap-2">
                          <TokenAvatar symbol={baseToken.symbol} address={baseToken.address} size={20} />
                          <span className="text-base text-foreground">{baseToken.symbol}</span>
                        </span>
                      ) : (
                        <span className="text-base text-foreground">Select</span>
                      )}
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => openTokenPicker("quote")}
                    className="text-left rounded-xl border border-white/10 bg-muted/20 px-4 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="text-xs text-muted-foreground mb-2">Quote token</div>
                    <div className="flex items-center justify-between w-full">
                      {quoteToken ? (
                        <span className="flex items-center gap-2">
                          <TokenAvatar symbol={quoteToken.symbol} address={quoteToken.address} size={20} />
                          <span className="text-base text-foreground">{quoteToken.symbol}</span>
                        </span>
                      ) : (
                        <span className="text-base text-foreground">Select</span>
                      )}
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </button>
                </div>

                <div className="text-sm text-foreground font-medium mb-3">Fee Tier</div>
                <div className="w-full rounded-xl border border-white/10 bg-muted/20 px-4 py-3 mb-5">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    The amount earned providing liquidity. All Gliese pools have fixed 0.1% fees.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={!baseToken || !quoteToken}
                  onClick={() => setNewPoolStep(2)}
                  className="w-full py-3 rounded-xl text-base font-semibold text-black bg-gradient-to-r from-cyan-300 to-teal-300 hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:opacity-40"
                >
                  Continue
                </button>
              </div>
              )}
              {newPoolStep === 2 && (
                <div className="rounded-2xl border border-white/10 p-6" style={{ backgroundColor: "#262626" }}>
                  <div className="text-base text-foreground font-semibold mb-1">Set initial price</div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    When creating a new pool, you must set the starting exchange rate for both tokens. This rate will reflect the initial market price.
                  </p>

                  <div className="rounded-xl border border-white/10 bg-muted/20 px-5 py-4 mb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs text-muted-foreground mb-1">Initial price</div>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={initialPrice}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === "" || /^[0-9]*\.?[0-9]*$/.test(v)) setInitialPrice(v);
                          }}
                          placeholder="0.00"
                          className="w-full bg-transparent border-0 outline-none p-0 text-xl text-foreground font-semibold tabular-nums focus:ring-0"
                        />
                        <div className="text-xs text-muted-foreground mt-2">
                          {(priceInverted ? baseToken?.symbol : quoteToken?.symbol) || "—"} = 1 {(priceInverted ? quoteToken?.symbol : baseToken?.symbol) || "—"}
                        </div>
                      </div>
                      <div className="flex items-center bg-muted/30 border border-white/10 rounded-md p-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setPriceInverted(false)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${!priceInverted ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                        >
                          {baseToken && <TokenAvatar symbol={baseToken.symbol} address={baseToken.address} size={16} />}
                          {baseToken?.symbol || "Base"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPriceInverted(true)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${priceInverted ? "bg-white/10 text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                        >
                          {quoteToken && <TokenAvatar symbol={quoteToken.symbol} address={quoteToken.address} size={16} />}
                          {quoteToken?.symbol || "Quote"}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-muted/20 px-5 py-3 mb-6 flex items-center justify-between">
                    <div>
                      <div className="text-xs text-muted-foreground">Current price</div>
                      <div className="text-sm text-foreground font-medium">
                        0.49199 {baseToken?.symbol || "—"}/{quoteToken?.symbol || "—"} <span className="text-muted-foreground">($2,321.50)</span>
                      </div>
                    </div>
                    <button type="button" className="text-xs text-foreground hover:text-primary transition-colors">
                      Use market price
                    </button>
                  </div>

                  <div className="text-base text-foreground font-semibold mb-1">Liquidity spread</div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    controls how widely liquidity is distributed around the market price. Lower spread gives tighter execution, higher spread gives LP's more protection in volatile markets.
                  </p>

                  <div className="grid grid-cols-4 gap-3 mb-4">
                    {([
                      { tier: "Tight", desc: "Best for most pairs.", tvl: "$97.6K TVL", pct: "98.933% select" },
                      { tier: "Moderate", desc: "Best for stable pairs.", tvl: "$1.1K TVL", pct: "1.065% select" },
                      { tier: "Broad", desc: "Best for exotic pairs.", tvl: "$2.78 TVL", pct: "0.002% select" },
                      { tier: "Wide", desc: "Best for very stable pairs.", tvl: "0 TVL", pct: "" },
                    ] as const).map((f) => {
                      const active = feeTier === f.tier;
                      return (
                        <button
                          key={f.tier}
                          type="button"
                          onClick={() => setFeeTier(f.tier)}
                          className={`relative text-left rounded-xl border px-3 py-3 transition-colors ${active ? "border-primary/40 bg-muted/40" : "border-white/10 bg-muted/20 hover:bg-muted/30"}`}
                        >
                          {active && (
                            <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            </div>
                          )}
                          <div className="text-sm text-foreground font-semibold mb-1">{f.tier}</div>
                          <div className="text-xs text-muted-foreground mb-3 leading-snug">{f.desc}</div>
                          <div className="text-xs text-foreground">{f.tvl}</div>
                          {f.pct && <div className="text-xs text-muted-foreground">{f.pct}</div>}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setNewPoolStep(3)}
                    className="w-full py-3 rounded-xl text-base font-semibold text-black bg-white hover:opacity-90 transition-opacity"
                  >
                    Continue
                  </button>
                </div>
              )}

              {newPoolStep === 3 && (
                <>
                  <div
                    className="rounded-2xl border border-white/10 px-5 py-3 mb-4 flex items-start justify-between gap-3"
                    style={{ backgroundColor: "#262626" }}
                  >
                    <div className="space-y-1 text-sm">
                      <div className="flex items-baseline gap-2">
                        <span className="text-muted-foreground">Initial price:</span>
                        <span className="text-foreground font-semibold tabular-nums">{initialPrice || "0"}</span>
                        <span className="text-muted-foreground text-xs">
                          {(priceInverted ? baseToken?.symbol : quoteToken?.symbol) || "—"} per {(priceInverted ? quoteToken?.symbol : baseToken?.symbol) || "—"}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-muted-foreground">Price range:</span>
                        <span className="text-foreground font-semibold tabular-nums">0 - 18.446.051T</span>
                        <span className="text-muted-foreground text-xs">
                          {(priceInverted ? baseToken?.symbol : quoteToken?.symbol) || "—"} per {(priceInverted ? quoteToken?.symbol : baseToken?.symbol) || "—"}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewPoolStep(2)}
                      className="text-muted-foreground hover:text-foreground transition-colors mt-0.5"
                      aria-label="Edit price"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="rounded-2xl border border-white/10 p-5 relative" style={{ backgroundColor: "#262626" }}>
                    {/* Token A deposit */}
                    <div className="rounded-xl border border-white/10 bg-muted/20 px-4 py-5">
                      <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground mb-2">
                        <Wallet className="w-3.5 h-3.5" />
                        <span>0.00 {baseToken?.symbol || "—"}</span>
                        <button type="button" className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/10 text-foreground hover:bg-white/20 transition-colors">HALF</button>
                        <button type="button" className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/10 text-foreground hover:bg-white/20 transition-colors">MAX</button>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 shrink-0">
                          {baseToken && <TokenAvatar symbol={baseToken.symbol} address={baseToken.address} size={28} />}
                          <span className="text-2xl text-foreground font-semibold leading-none">{baseToken?.symbol || "—"}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={amountA}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v === "" || /^[0-9]*\.?[0-9]*$/.test(v)) setAmountA(v);
                            }}
                            placeholder="0.00"
                            className="w-40 bg-transparent border-0 outline-none p-0 text-2xl text-foreground font-semibold tabular-nums text-right focus:ring-0"
                          />
                          <span className="text-xs text-muted-foreground">$0.00</span>
                        </div>
                      </div>
                    </div>

                    {/* Plus connector */}
                    <div className="flex justify-center -my-2 relative z-10">
                      <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center ring-4 ring-[#262626]">
                        <Plus className="w-4 h-4 text-black" />
                      </div>
                    </div>

                    {/* Token B deposit */}
                    <div className="rounded-xl border border-white/10 bg-muted/20 px-4 py-5">
                      <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground mb-2">
                        <Wallet className="w-3.5 h-3.5" />
                        <span>0.00 {quoteToken?.symbol || "—"}</span>
                        <button type="button" className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/10 text-foreground hover:bg-white/20 transition-colors">HALF</button>
                        <button type="button" className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/10 text-foreground hover:bg-white/20 transition-colors">MAX</button>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 shrink-0">
                          {quoteToken && <TokenAvatar symbol={quoteToken.symbol} address={quoteToken.address} size={28} />}
                          <span className="text-2xl text-foreground font-semibold leading-none">{quoteToken?.symbol || "—"}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={amountB}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (v === "" || /^[0-9]*\.?[0-9]*$/.test(v)) setAmountB(v);
                            }}
                            placeholder="0.00"
                            className="w-40 bg-transparent border-0 outline-none p-0 text-2xl text-foreground font-semibold tabular-nums text-right focus:ring-0"
                          />
                          <span className="text-xs text-muted-foreground">$0.00</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="mt-4 w-full py-3 rounded-xl text-base font-semibold text-black bg-white hover:opacity-90 transition-opacity"
                    >
                      Add Liquidity
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Right spacer to keep form centered on the page */}
            <div aria-hidden="true" />
          </div>
        </div>

        <Dialog open={tokenPickerOpen} onOpenChange={setTokenPickerOpen}>
          <DialogOverlay />
          <DialogContent className="sm:max-w-md bg-[#0b0f17]/95 border border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="text-white">
                {tokenPickerTarget === "base" ? "Select base token" : "Select Quote token"}
              </DialogTitle>
            </DialogHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
              <Input
                placeholder="Search any token. Include '0x' for exact match."
                value={tokenSearch}
                onChange={(e) => setTokenSearch(e.target.value)}
                className="pl-10 bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:border-white/40 focus:bg-white/10 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            {tokenSearch.trim() && tokenSearching && (
              <div className="flex items-center gap-2 text-xs text-white/60 py-1">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Searching DEXes…</span>
              </div>
            )}
            <ScrollArea className="h-[30.5rem] w-full pr-4">
              <div className="space-y-2">
                {filteredPoolTokens.map((t) => (
                  <Button
                    key={t.address ?? `sym:${t.symbol}`}
                    variant="ghost"
                    className="w-full py-3 px-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors h-auto"
                    onClick={() => handleSelectToken(t)}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                        <TokenAvatar symbol={t.symbol} address={t.address} size={30} title={t.name || t.symbol} />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-semibold text-white text-base flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1">
                            {t.symbol}
                            {isVerifiedPoolToken(t) && (
                              <img src={verifiedBadge} alt="verified" className="w-3.5 h-3.5 inline-block" />
                            )}
                          </div>
                          <TokenBalanceDisplay
                            tokenAddress={t.address as Address | undefined}
                            walletAddress={walletAddress}
                          />
                        </div>
                        <div className="text-sm text-white/60">{t.name || "Unknown"}</div>
                        <div className="text-sm text-white/60 font-mono">
                          {t.address ? formatAddress(t.address) : "Native coin"}
                        </div>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (selectedPool) {
    const ratioA = 57.1;
    const ratioB = 42.9;
    return (
      <div className="relative w-full h-[calc(100vh-65px)] overflow-hidden z-20" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}>
        <TopLoadingBar isLoading={isLoading} onComplete={handleLoadingComplete} duration={400} />
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
            <a
              href="#"
              className="ml-auto self-end inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              How does depositing into a Gliese pool work
              <Info className="w-4 h-4" />
            </a>
          </div>

          {/* Pool Composition */}
          <div className="rounded-2xl border border-white/10 p-6 mb-4" style={{ backgroundColor: "#262626" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base text-foreground">Pool Composition</h2>
            </div>
            <div className="flex w-full h-10 gap-1">
              <div
                className="flex items-center justify-start pl-3 text-xs font-semibold text-white rounded-lg bg-sky-500"
                style={{ width: `${ratioA}%` }}
              >
                {ratioA}% {selectedPool.symbolA}
              </div>
              <div
                className="flex items-center justify-end pr-3 text-xs font-semibold text-white rounded-lg bg-emerald-400"
                style={{ width: `${ratioB}%` }}
              >
                {ratioB}% {selectedPool.symbolB}
              </div>
            </div>
          </div>

          {/* Stats + Add Liquidity */}
          <div className="flex gap-4 items-start">
          <div className="w-[40%] rounded-2xl border border-white/10 p-6" style={{ backgroundColor: "#262626" }}>
            <h2 className="text-base text-foreground mb-4">Stats</h2>
            <div className="space-y-5">
              <div>
                <div className="text-sm text-muted-foreground mb-1">TVL</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl text-foreground">$133.6M</span>
                  <span className="text-xs text-emerald-400 flex items-center gap-0.5">
                    <ArrowUp className="w-3 h-3" />0.15%
                  </span>
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">24H volume</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl text-foreground">$23.2K</span>
                  <span className="text-xs text-emerald-400 flex items-center gap-0.5">
                    <ArrowUp className="w-3 h-3" />391.01%
                  </span>
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">24H fees</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl text-foreground">$69.49</span>
                </div>
              </div>
            </div>
          </div>
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
                  <span className="text-xs text-muted-foreground mt-2">$0.00</span>
                </div>
              </div>
            </div>

            {/* Plus divider */}
            <div className="relative flex justify-center -my-3 z-10">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center ring-4 ring-[#262626]">
                <Plus className="w-4 h-4 text-black" />
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
                  <span className="text-xs text-muted-foreground mt-2">$0.00</span>
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
      <TopLoadingBar isLoading={isLoading} onComplete={handleLoadingComplete} duration={400} />
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
            <button onClick={openNewPool} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white text-black text-sm hover:bg-white/90 transition-colors">
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
                className="grid grid-cols-[40px_2fr_1fr_1fr_1fr_1fr_1fr_120px] items-center gap-4 px-6 py-4 border-b border-white/5 last:border-b-0"
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