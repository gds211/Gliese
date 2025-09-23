// src/components/SwapInterface.tsx
import { useEffect, useMemo, useState } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogOverlay,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowUpDown, Wallet, Search, ChevronDown } from "lucide-react";
import glieseLogo from "@/assets/gliese-logo.png";
import { useAccount } from "wagmi";
import { useToast } from "@/components/ui/use-toast";
import { PUBLIC_CONFIG } from "@/config/public";
import {
  useTokenBalance,
  toDecimalStringFloor,
  type TokenMeta,
} from "@/hooks/useTokenBalance";
import { loadTokenList, type ListedToken } from "@/lib/tokenlist";

// --- helpers local to this component ---
const formatAddress = (address: string): string =>
  `${address.slice(0, 6)}...${address.slice(-6)}`;

const numberish = (v: string) => (v && !isNaN(+v) ? +v : 0);

// You can swap these with real quotes later.
// Keeping your mock pricing behavior so UI matches your current design.
const CRYPTO_USD: Record<string, number> = {
  MON: 0.00215,
  USDC: 1.0,
  USDT: 1.0,
  DAI: 1.0,
  // Avoid ETH/BTC on Monad testnet by default; they won’t appear unless
  // you add them to the tokenlist JSON.
};

const calculateUSDValue = (amount: string, token: string): string => {
  const numAmount = numberish(amount);
  const price = CRYPTO_USD[token] || 0;
  const usd = numAmount * price;
  if (usd > 0 && usd < 0.01) return `$${usd.toFixed(6)}`;
  return `$${usd.toFixed(2)}`;
};

const SwapInterface = () => {
  const { address, isConnected } = useAccount();
  const { toast } = useToast();

  // ---------------- Token list (native + ERC20 from JSON) ----------------
  const [erc20s, setErc20s] = useState<ListedToken[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const list = await loadTokenList(); // uses PUBLIC_CONFIG.TOKENLIST_URL
        setErc20s(list.tokens);
        setListError(null);
      } catch (e: any) {
        console.error(e);
        setErc20s([]);
        setListError(e?.message || "Failed to load token list");
      } finally {
        setLoadingList(false);
      }
    })();
  }, []);

  // Build UI token array: native first, then ERC-20s from list (dedup by symbol)
  const tokens: TokenMeta[] = useMemo(() => {
    const base: TokenMeta[] = [{ symbol: PUBLIC_CONFIG.NATIVE_SYMBOL }];
    const mapped = erc20s.map<TokenMeta>((t) => ({
      symbol: t.symbol,
      address: t.address,
      decimals: t.decimals,
    }));
    const seen = new Set(base.map((t) => t.symbol));
    return [
      ...base,
      ...mapped.filter((t) => !seen.has(t.symbol) && seen.add(t.symbol)),
    ];
  }, [erc20s]);

  // ---------------- UI state ----------------
  const [sellToken, setSellToken] = useState<string>(
    PUBLIC_CONFIG.NATIVE_SYMBOL
  );
  const [buyToken, setBuyToken] = useState<string>("USDC"); // default target
  const [sellAmount, setSellAmount] = useState<string>("");
  const [priceRate, setPriceRate] = useState("1 MON = 0.00215 USDC");

  // Modal state for token picker
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenSelectionType, setTokenSelectionType] = useState<"sell" | "buy">(
    "sell"
  );
  const [searchTerm, setSearchTerm] = useState("");

  // If a selected symbol disappears from list, reset to native
  useEffect(() => {
    const syms = new Set(tokens.map((t) => t.symbol));
    if (!syms.has(sellToken)) setSellToken(PUBLIC_CONFIG.NATIVE_SYMBOL);
    if (!syms.has(buyToken)) setBuyToken(PUBLIC_CONFIG.NATIVE_SYMBOL);
  }, [tokens, sellToken, buyToken]);

  // ---------------- Live balance for current sell token ----------------
  const bal = useTokenBalance({
    symbol: sellToken,
    tokens,
    gasBufferForNative: PUBLIC_CONFIG.NATIVE_GAS_BUFFER,
  });

  const halfMaxDisabled =
    !bal.isConnected || bal.isLoading || bal.isError || bal.spendableRaw <= 0n;

  const setAmountFromRaw = (raw: bigint) => {
    setSellAmount(raw > 0n ? toDecimalStringFloor(raw, bal.decimals, 6) : "");
  };

  const handleHalfClick = () => {
    if (halfMaxDisabled) return;
    const half = bal.spendableRaw / 2n;
    setAmountFromRaw(half);
    toast({
      title: "Filled HALF",
      description: `Set to ~${toDecimalStringFloor(
        half,
        bal.decimals,
        6
      )} ${sellToken}`,
      duration: 1800,
    });
  };

  const handleMaxClick = () => {
    if (halfMaxDisabled) return;
    setAmountFromRaw(bal.spendableRaw);
    toast({
      title: "Filled MAX",
      description: `Set to ~${toDecimalStringFloor(
        bal.spendableRaw,
        bal.decimals,
        6
      )} ${sellToken}`,
      duration: 1800,
    });
  };

  // Swap tokens (and amounts) like your original
  const handleSwapTokens = () => {
    const tmpToken = sellToken;
    setSellToken(buyToken);
    setBuyToken(tmpToken);

    const tmpAmt = sellAmount;
    // compute derived buy in the UI; but keep swap visual parity
    setSellAmount(
      (() => {
        const sellPrice = CRYPTO_USD[buyToken] || 0;
        const buyPrice = CRYPTO_USD[tmpToken] || 0; // after switch, tmpToken becomes buy side
        const amt = numberish(tmpAmt);
        if (sellPrice > 0 && buyPrice > 0 && amt > 0) {
          const calc = (amt * sellPrice) / buyPrice;
          return calc.toFixed(4);
        }
        return tmpAmt;
      })()
    );
  };

  // Token modal actions
  const openTokenModal = (type: "sell" | "buy") => {
    setTokenSelectionType(type);
    setShowTokenModal(true);
    setSearchTerm("");
  };

  const selectToken = (symbol: string) => {
    if (tokenSelectionType === "sell") {
      setSellToken(symbol);
    } else {
      setBuyToken(symbol);
    }
    setShowTokenModal(false);
  };

  // Filtered tokens for modal (by symbol, name or address)
  const filteredTokens = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const listForModal = [
      // native first (fake address text to keep same layout)
      {
        symbol: PUBLIC_CONFIG.NATIVE_SYMBOL,
        name: `${PUBLIC_CONFIG.NATIVE_SYMBOL} (Native)`,
        address: "0x0000000000000000000000000000000000000000",
        isNative: true,
      },
      ...erc20s.map((t) => ({
        symbol: t.symbol,
        name: t.name || t.symbol,
        address: t.address,
        isNative: false,
      })),
    ];

    if (!q) return listForModal;

    return listForModal.filter((t) => {
      const sym = t.symbol.toLowerCase();
      const nm = (t.name || "").toLowerCase();
      const addr = t.address.toLowerCase();
      return sym.includes(q) || nm.includes(q) || addr.includes(q);
    });
  }, [searchTerm, erc20s]);

  // ---- mocked price rate ticker (kept from your original behavior) ----
  useEffect(() => {
    const updatePriceRate = () => {
      const sellP = CRYPTO_USD[sellToken] || 0;
      const buyP = CRYPTO_USD[buyToken] || 0;
      if (sellP > 0 && buyP > 0) {
        const base = sellP / buyP;
        const variation = (Math.random() - 0.5) * (base * 0.001);
        const rate = (base + variation).toFixed(5);
        setPriceRate(`1 ${sellToken} = ${rate} ${buyToken}`);
      } else {
        setPriceRate(`1 ${sellToken} = — ${buyToken}`);
      }
    };
    updatePriceRate();
    const id = setInterval(updatePriceRate, 20000);
    return () => clearInterval(id);
  }, [sellToken, buyToken]);

  // Derived “buy amount” for display (mocked by prices, like your original)
  const buyAmount = useMemo(() => {
    const sellP = CRYPTO_USD[sellToken] || 0;
    const buyP = CRYPTO_USD[buyToken] || 0;
    const amt = numberish(sellAmount);
    if (sellP > 0 && buyP > 0 && amt > 0) {
      const calc = (amt * sellP) / buyP;
      return calc.toFixed(4);
    }
    return "0.00";
  }, [sellAmount, sellToken, buyToken]);

  const swapDisabled =
    !sellAmount || sellAmount === "0" || sellAmount === "0.0";

  return (
    <Card className="w-full max-w-md mx-auto bg-muted/40 backdrop-blur-md border border-muted/60 shadow-2xl">
      <div className="p-4 space-y-4">
        {/* Tabs */}
        <Tabs defaultValue="instant" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-muted/40 h-10">
            <TabsTrigger
              value="instant"
              className="text-sm flex items-center gap-2 h-8 data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground"
            >
              <span className="data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground">
                ⚡
              </span>{" "}
              Instant
            </TabsTrigger>
            <TabsTrigger
              value="trigger"
              className="text-sm flex items-center gap-2 h-8 data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground"
            >
              <span className="data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground">
                🔫
              </span>{" "}
              Trigger
            </TabsTrigger>
            <TabsTrigger
              value="recurring"
              className="text-sm flex items-center gap-2 h-8 data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground"
            >
              <span className="data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground">
                🔄
              </span>{" "}
              Recurring
            </TabsTrigger>
          </TabsList>

          <TabsContent value="instant" className="mt-4 space-y-3">
            {/* Selling Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm text-muted-foreground">Selling</label>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Wallet className="h-3 w-3" />
                    {isConnected ? (
                      bal.isLoading ? (
                        "…"
                      ) : bal.isError ? (
                        `0.00 ${sellToken}`
                      ) : (
                        `${bal.displayBalance} ${sellToken}`
                      )
                    ) : (
                      "Connect wallet"
                    )}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-2 text-xs text-muted-foreground bg-muted border border-muted-foreground/40 rounded hover:text-primary hover:border-primary hover:bg-muted transition-all duration-200"
                    onClick={handleHalfClick}
                    disabled={halfMaxDisabled}
                  >
                    HALF
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-2 text-xs text-muted-foreground bg-muted border border-muted-foreground/40 rounded hover:text-primary hover:border-primary hover:bg-muted transition-all duration-200"
                    onClick={handleMaxClick}
                    disabled={halfMaxDisabled}
                  >
                    MAX
                  </Button>
                </div>
              </div>

              <div className="relative bg-background/60 rounded-xl border border-border/60 p-4 focus-within:border-white transition-colors duration-200">
                <div className="flex items-center justify-between mb-2">
                  <Button
                    variant="ghost"
                    onClick={() => openTokenModal("sell")}
                    className="w-36 h-9 bg-muted/60 rounded-full border-none p-2 hover:bg-muted/80 flex items-center justify-between"
                  >
                    <span>{sellToken}</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                  <Input
                    value={sellAmount}
                    onChange={(e) => setSellAmount(e.target.value)}
                    className="!border-none !bg-transparent text-right !text-[30px] font-semibold !focus-visible:ring-0 !focus:ring-0 !outline-none pr-2 h-auto text-foreground !shadow-none !ring-0 !ring-offset-0"
                    placeholder="0.00"
                    inputMode="decimal"
                  />
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  {calculateUSDValue(sellAmount, sellToken)}
                </div>
              </div>
            </div>

            {/* Swap Arrow */}
            <div className="flex justify-center -my-2 relative z-10">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSwapTokens}
                className="h-8 w-8 p-0 bg-background/60 hover:bg-white rounded-md border border-border/40 transition-colors duration-200"
              >
                <ArrowUpDown className="h-4 w-4 text-blue-600" />
              </Button>
            </div>

            {/* Buying Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm text-muted-foreground">Buying</label>
              </div>
              <div className="relative bg-background/60 rounded-xl border border-border/60 p-4">
                <div className="flex items-center justify-between mb-2">
                  <Button
                    variant="ghost"
                    onClick={() => openTokenModal("buy")}
                    className="w-36 h-9 bg-muted/60 rounded-full border-none p-2 hover:bg-muted/80 flex items-center justify-between"
                  >
                    <span>{buyToken}</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                  <Input
                    value={buyAmount}
                    readOnly
                    className="!border-none !bg-transparent text-right !text-[30px] font-semibold !focus-visible:ring-0 !focus:ring-0 !outline-none pr-2 h-auto text-foreground !shadow-none !ring-0 !ring-offset-0"
                  />
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  {calculateUSDValue(buyAmount, buyToken)}
                </div>
              </div>
            </div>

            {/* Swap Button (wire to your quote/swap later) */}
            <Button
              className="w-full h-12 mt-6 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              disabled={swapDisabled}
              onClick={() =>
                toast({
                  title: "Swap clicked",
                  description:
                    "Wire this to your Yak quote + swap flow next (findBestPathWithGas → swapNoSplit).",
                })
              }
            >
              {swapDisabled ? "Enter an amount" : "Swap"}
            </Button>

            {/* Footer Info */}
            <div className="flex items-center justify-between px-4 mt-32 text-xs text-muted-foreground">
              <span>{priceRate}</span>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 border-2 border-border px-2 py-1 rounded-lg">
                  <img
                    src={glieseLogo}
                    alt="Gliese"
                    className="w-4 h-4 rounded-lg"
                  />
                  <span>Wrapdrive v1.1</span>
                </div>
                <span>0.02% FEE</span>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="trigger">
            <div className="text-center text-muted-foreground py-8">
              Trigger orders coming soon
            </div>
          </TabsContent>

          <TabsContent value="recurring">
            <div className="text-center text-muted-foreground py-8">
              Recurring orders coming soon
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Token Selection Modal */}
      <Dialog open={showTokenModal} onOpenChange={setShowTokenModal}>
        <DialogOverlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]" />
        <DialogContent
          className="max-w-md mx-auto backdrop-blur-xl border border-white/10 shadow-2xl"
          style={{ backgroundColor: "#000" }}
        >
          <DialogHeader className="pb-4">
            <DialogTitle className="text-lg font-semibold text-white">
              Select Token
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/60" />
              <Input
                placeholder="Search token or paste address (0x...)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/5 border border-white/20 text-white placeholder:text-white/40 focus:border-white/40 focus:bg-white/10"
              />
            </div>

            {/* Token List */}
            <ScrollArea className="h-[30rem] w-full pr-4">
              <div className="space-y-1">
                {filteredTokens.map((t) => (
                  <Button
                    key={`${t.symbol}-${t.address}`}
                    variant="ghost"
                    onClick={() => selectToken(t.symbol)}
                    className="w-full justify-start pl-0 pr-4 py-4 h-auto hover:bg-white/5 rounded-lg group"
                  >
                    <div className="flex items-center w-full">
                      {/* Token Icon */}
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                        {t.symbol.charAt(0)}
                      </div>

                      {/* Token Info */}
                      <div className="flex-1 text-left ml-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-white">
                            {t.symbol}
                          </span>
                          {t.isNative && (
                            <span className="text-[10px] text-white/50 border border-white/20 rounded px-1">
                              Native
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-white/60">
                          {(t.name || t.symbol).toLowerCase()}
                        </div>
                        <div className="text-xs text-white/40">
                          {formatAddress(t.address)}
                        </div>
                      </div>

                      {/* Right side info (placeholder TVL/vol) */}
                      <div className="text-right">
                        <div className="text-xs text-white/60">
                          ${(Math.random() * 1000000).toFixed(0)}
                        </div>
                      </div>
                    </div>
                  </Button>
                ))}

                {!loadingList && filteredTokens.length === 0 && (
                  <div className="text-center text-white/50 py-6 text-sm">
                    No tokens match your search.
                  </div>
                )}

                {listError && (
                  <div className="text-center text-red-400 py-3 text-xs">
                    {listError}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default SwapInterface;
