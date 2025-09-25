// src/components/SwapInterface.tsx
import { useState, useMemo, useEffect } from "react";
import { Address, parseUnits } from "viem";
import { useAccount, useBalance } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogOverlay } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";

import { ArrowUpDown, Wallet, Search, ChevronDown } from "lucide-react";
import glieseLogo from "@/assets/gliese-logo.png";

import { PUBLIC_CONFIG } from "@/config/public";
import { useYakQuote } from "@/hooks/useYakQuote";
import { performSwap } from "@/lib/swap";

// -------------------- Local helpers --------------------
function formatAmount(raw: bigint, decimals: number, maxFrac: number = 6): string {
  // viem's formatUnits is fine, but we keep a tiny custom wrapper to trim zeros
  const full = (Number(raw) / 10 ** decimals).toString(); // only used for HALF/MAX visual; OK
  const [w, f = ""] = full.split(".");
  if (maxFrac <= 0 || f.length === 0) return w;
  const clamped = f.slice(0, maxFrac).replace(/0+$/, "");
  return clamped ? `${w}.${clamped}` : w;
}

function formatAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
}

// -------------------- Component --------------------
const SwapInterface = () => {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { toast } = useToast();

  // --- Token list (your current list) ---
  const cryptoPrices = {
    MON: 0.00215,
    USDC: 1.0,
    USDT: 1.0,
    CHOG: 16.0,
    DAK: 2650.0,
    aprMON: 0.00214,
  };

  const tokens = [
    { symbol: "MON", name: "monad" }, // native (no address)
    { symbol: "USDC", name: "USD Coin", address: "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea" as `0x${string}` },
    { symbol: "USDT", name: "Tether USD", address: "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D" as `0x${string}` },
    { symbol: "CHOG", name: "chog", address: "0xE0590015A873bF326bd645c3E1266d4db41C4E6B" as `0x${string}` },
    { symbol: "DAK", name: "Mollandak", address: "0x0F0BDEbF0F83cD1EE3974779Bcb7315f9808c714" as `0x${string}` },
    { symbol: "aprMON", name: "apriori MON", address: "0xb2f82D0f38dc453D596Ad40A37799446Cc89274A" as `0x${string}` },
  ];

  // --- UI State ---
  const [sellAmount, setSellAmount] = useState("");
  const [sellToken, setSellToken] = useState("MON");
  const [buyToken, setBuyToken] = useState("USDC");
  const [priceRate, setPriceRate] = useState("1 MON = 0.00215 USDC");

  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenSelectionType, setTokenSelectionType] = useState<"sell" | "buy">("sell");
  const [searchTerm, setSearchTerm] = useState("");

  const selectedSellToken = useMemo(() => tokens.find((t) => t.symbol === sellToken), [tokens, sellToken]);
  const selectedBuyToken = useMemo(() => tokens.find((t) => t.symbol === buyToken), [tokens, buyToken]);

  // Treat MON as native when it has no address
  const isNativeSell = useMemo(
    () => !!selectedSellToken && (selectedSellToken.symbol === "MON" || !selectedSellToken.address),
    [selectedSellToken]
  );

  // === Live wallet balance for SELL token ===
  const { data: sellBal, isLoading: sellBalLoading } = useBalance({
    address,
    token: isNativeSell ? undefined : (selectedSellToken?.address as `0x${string}` | undefined),
    query: { enabled: Boolean(isConnected && address && selectedSellToken), refetchOnWindowFocus: false },
  });

  // Balance exceed flag (based on decimals of the current token)
  const isExceeding = useMemo(() => {
    if (!isConnected || !sellBal || !sellAmount) return false;
    try {
      const wantRaw = parseUnits(sellAmount, sellBal.decimals);
      return wantRaw > sellBal.value;
    } catch {
      return false; // while typing invalid formats
    }
  }, [isConnected, sellBal?.value, sellBal?.decimals, sellAmount]);

  // --- Filter for token modal ---
  const filteredTokens = tokens.filter(
    (t) =>
      t.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- Quote from Yak (every 2s, 5% slippage, threshold ≥ 0.1%) ---
  const router = PUBLIC_CONFIG.YAK_ROUTER as Address;
  const tokenInArg = selectedSellToken?.address ?? sellToken; // pass address if exists; otherwise symbol "MON"
  const tokenOutArg = selectedBuyToken?.address ?? buyToken;

  const quote = useYakQuote({
    router,
    tokenIn: tokenInArg,
    tokenOut: tokenOutArg,
    amountInHuman: sellAmount || "0",
    enabled: Boolean(sellAmount && selectedSellToken && selectedBuyToken),
  });

  // Derived buy amount shown to the user (minOut, already 5% slippage)
  const buyAmountDerived = quote?.minOutFormatted ?? "0.00";
  
  // Display version limited to 6 decimals for UI
  const buyAmountDisplay = useMemo(() => {
    const num = Number(buyAmountDerived);
    if (isNaN(num)) return "0.00";
    if (num === 0) return "0.00";
    return num.toFixed(6).replace(/\.?0+$/, '');
  }, [buyAmountDerived]);

  // Rate display: prefer on-chain quote if available; else fallback to your mock priceRate
  const rateDisplay = useMemo(() => {
    const amt = Number(sellAmount);
    if (quote && amt > 0) {
      const r = Number(buyAmountDerived) / amt;
      if (isFinite(r) && r > 0) return `1 ${sellToken} = ${r.toFixed(6)} ${buyToken}`;
    }
    return priceRate;
  }, [quote, buyAmountDerived, sellAmount, sellToken, buyToken, priceRate]);

  // Keep your existing mock updater as a fallback when no quote yet
  useEffect(() => {
    const updatePriceRate = () => {
      const sellPrice = (cryptoPrices as any)[sellToken] || 0;
      const buyPrice = (cryptoPrices as any)[buyToken] || 0;
      if (sellPrice > 0 && buyPrice > 0) {
        const exchangeRate = sellPrice / buyPrice;
        const variation = (Math.random() - 0.5) * (exchangeRate * 0.001);
        const newRate = (exchangeRate + variation).toFixed(5);
        setPriceRate(`1 ${sellToken} = ${newRate} ${buyToken}`);
      }
    };
    updatePriceRate();
    const interval = setInterval(updatePriceRate, 20000);
    return () => clearInterval(interval);
  }, [sellToken, buyToken]);

  // USD helpers (for your current UI)
  const calculateUSDValue = (amount: string, token: string): string => {
    const numAmount = parseFloat(amount) || 0;
    const price = (cryptoPrices as any)[token] || 0;
    const usdValue = numAmount * price;
    return usdValue < 0.01 && usdValue > 0 ? `$${usdValue.toFixed(6)}` : `$${usdValue.toFixed(2)}`;
  };

  // Handlers
  const handleSwapTokens = () => {
    // Swap tokens
    const t = sellToken;
    setSellToken(buyToken);
    setBuyToken(t);
    // Swap amounts - only use derived buy amount if there was a meaningful sell amount
    const hasValue = sellAmount && sellAmount !== "0" && sellAmount !== "0.0" && sellAmount !== "0.00";
    setSellAmount(hasValue ? buyAmountDerived : "");
  };

  const openTokenModal = (type: "sell" | "buy") => {
    setTokenSelectionType(type);
    setShowTokenModal(true);
    setSearchTerm("");
  };

  const selectToken = (token: string) => {
    if (tokenSelectionType === "sell") {
      setSellToken(token);
      setSellAmount(""); // reset to avoid wrong decimals context
    } else {
      setBuyToken(token);
    }
    setShowTokenModal(false);
  };

  // === SWAP click ===
  const onClickSwap = async () => {
    try {
      if (!isConnected) {
        openConnectModal?.();
        return;
      }
      if (!sellAmount || Number(sellAmount) <= 0) throw new Error("Enter an amount.");
      if (!quote || quote.minOutRaw === 0n || !quote.path?.length) throw new Error("No route found.");
      if (!selectedSellToken || !selectedBuyToken) throw new Error("Select tokens.");

      // Get decimals from balance hook (reliable for the selected SELL token)
      const inDec = sellBal?.decimals ?? 18;
      const amountIn = parseUnits(sellAmount, inDec);

      toast({ title: "Preparing swap...", description: "Checking allowance & building txn" });

      const receipt = await performSwap({
        router,
        tokenIn: selectedSellToken.address ?? selectedSellToken.symbol, // "MON" is fine here for native detection
        tokenOut: selectedBuyToken.address ?? selectedBuyToken.symbol,
        amountIn,
        amountOutMin: quote.minOutRaw, // 5% slippage already applied by the hook
        path: quote.path,
        adapters: quote.adapters,
      });

      toast({
        title: "Swap confirmed ✅",
        description: `Tx: ${receipt.transactionHash.slice(0, 10)}…`,
      });
      // optional: clear amount or refresh balances
    } catch (err: any) {
      const msg = err?.shortMessage || err?.message || String(err);
      toast({ title: "Swap failed", description: msg });
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-muted/40 backdrop-blur-md border border-muted/60 shadow-2xl">
      <div className="p-4 space-y-4">
        {/* Tabs */}
        <Tabs defaultValue="instant" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-muted/40 h-10">
            <TabsTrigger value="instant" className="text-sm flex items-center gap-2 h-8 data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground">
              <span>⚡</span> Instant
            </TabsTrigger>
            <TabsTrigger value="trigger" className="text-sm flex items-center gap-2 h-8 data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground">
              <span>🔫</span> Trigger
            </TabsTrigger>
            <TabsTrigger value="recurring" className="text-sm flex items-center gap-2 h-8 data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground">
              <span>🔄</span> Recurring
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
                    {sellBalLoading ? "…" : sellBal ? `${Number(sellBal.formatted).toFixed(4)} ${sellToken}` : `0.00 ${sellToken}`}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-2 text-xs text-muted-foreground border border-border hover:border-primary hover:bg-muted transition-all duration-200"
                    onClick={() => {
                      if (!sellBal) return;
                      const halfRaw = sellBal.value / 2n;
                      const val = formatAmount(halfRaw, sellBal.decimals, 6);
                      setSellAmount(val);
                    }}
                  >
                    HALF
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-2 text-xs text-muted-foreground border border-border hover:border-primary hover:bg-muted transition-all duration-200"
                    onClick={() => {
                      if (!sellBal) return;
                      // keep small MON buffer for gas when selling native
                      const gasBufferRaw = isNativeSell ? parseUnits("0.003", sellBal.decimals) : 0n;
                      const available = sellBal.value > gasBufferRaw ? sellBal.value - gasBufferRaw : 0n;
                      const val = formatAmount(available, sellBal.decimals, 6);
                      setSellAmount(val);
                    }}
                  >
                    MAX
                  </Button>
                </div>
              </div>

              <div className="relative bg-background/60 rounded-2xl border border-white/10 focus-within:border-primary/60 transition-colors duration-200">
                <div className="flex items-center justify-between p-3">
                  <Button
                    variant="ghost"
                    onClick={() => openTokenModal("sell")}
                    className="w-36 h-9 bg-muted/60 rounded-full text-foreground border border-white/10 hover:border-primary/60 hover:bg-muted/80 flex items-center justify-between"
                  >
                    <span>{sellToken}</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                  <Input
                    value={sellAmount}
                    onChange={(e) => setSellAmount(e.target.value)}
                    className="!border-none !bg-transparent text-right flex-1 !text-24 font-medium tracking-tight pr-2 h-auto text-foreground !shadow-none !ring-0 !ring-offset-0"
                    style={{ color: isExceeding ? "#ef4444" : undefined }}
                    placeholder="0.00"
                  />
                </div>
                <div className="text-right text-sm text-muted-foreground pr-3 pb-3">
                  {(() => {
                    // USD estimate for SELL
                    const num = sellAmount || "0";
                    return calculateUSDValue(num, sellToken);
                  })()}
                </div>
              </div>
            </div>

            {/* Swap Arrow */}
            <div className="flex justify-center -my-2 relative z-10">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSwapTokens}
                className="h-8 w-8 p-0 bg-background/60 hover:bg-background rounded-md border border-border/40 transition-colors duration-200"
              >
                <ArrowUpDown className="h-4 w-4 text-blue-600" />
              </Button>
            </div>

            {/* Buying Section */}
            <div className="space-y-3">
              <div className="relative bg-background/60 rounded-2xl border border-white/10 focus-within:border-primary/60 transition-colors duration-200">
                <div className="flex items-center justify-between p-3">
                  <Button
                    variant="ghost"
                    onClick={() => openTokenModal("buy")}
                    className="w-36 h-9 bg-muted/60 rounded-full text-foreground border border-white/10 hover:border-primary/60 hover:bg-muted/80 flex items-center justify-between"
                  >
                    <span>{buyToken}</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                  <Input
                    value={buyAmountDisplay}
                    readOnly
                    className="!border-none !bg-transparent text-right flex-1 !text-24 font-medium tracking-tight pr-2 h-auto text-foreground !shadow-none !ring-0 !ring-offset-0"
                    placeholder="0.00"
                  />
                </div>
                <div className="text-right text-sm text-muted-foreground pr-3 pb-3">
                  {/* USD estimate for BUY */}
                  {calculateUSDValue(buyAmountDerived, buyToken)}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div>Rate: {rateDisplay}</div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 border-2 border-border px-2 py-1 rounded-lg">
                    <img src={glieseLogo} alt="Gliese" className="w-4 h-4 rounded-lg" />
                    <span>Wrapdrive v1.1</span>
                  </div>
                  <span>0.02% FEE</span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="trigger">
            <div className="text-center text-muted-foreground py-8">Trigger orders coming soon</div>
          </TabsContent>

          <TabsContent value="recurring">
            <div className="text-center text-muted-foreground py-8">Recurring orders coming soon</div>
          </TabsContent>
        </Tabs>

        {/* Connect/Swap Button */}
        <div className="w-full mt-4">
          <Button
            className="w-full"
            disabled={
              (!isConnected && !openConnectModal) ||
              !sellAmount ||
              sellAmount === "0" ||
              sellAmount === "0.0" ||
              isExceeding ||
              !quote ||
              quote.minOutRaw === 0n
            }
            onClick={() => {
              if (!isConnected) return openConnectModal?.();
              onClickSwap();
            }}
          >
            {!isConnected
              ? "Connect Wallet"
              : isExceeding
              ? "Amount exceeds balance"
              : !sellAmount || sellAmount === "0" || sellAmount === "0.0"
              ? "Enter an amount"
              : !quote || quote.minOutRaw === 0n
              ? "No route"
              : "Swap"}
          </Button>
        </div>
      </div>

      {/* Token Selection Modal */}
      <Dialog open={showTokenModal} onOpenChange={setShowTokenModal}>
        <DialogOverlay />
        <DialogContent className="sm:max-w-[420px] bg-[#0b0f17]/95 border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              Select a token to {tokenSelectionType === "sell" ? "sell" : "buy"}
            </DialogTitle>
          </DialogHeader>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
            <Input
              placeholder="Search any token. Include '0x' for exact match."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:border-white/40 focus:bg-white/10"
            />
          </div>

          {/* Token List */}
          <ScrollArea className="h-[26rem] w-full pr-4">
            <div className="space-y-2">
              {filteredTokens.map((token) => (
                <Button
                  key={token.symbol}
                  variant="ghost"
                  className="w-full justify-between py-3 px-3 rounded-xl border border-white/10 hover:bg-white/5"
                  onClick={() => selectToken(token.symbol)}
                >
                  <div className="flex items-center">
                    <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                      <img src={glieseLogo} alt={token.symbol} className="w-6 h-6" />
                    </div>
                    <div className="ml-3 text-left">
                      <div className="font-medium text-white">{token.symbol}</div>
                      <div className="text-xs text-white/60">{token.name}</div>
                    </div>
                  </div>
                  <div className="text-right text-xs text-white/60">
                    {token.address ? formatAddress(token.address) : "Native coin"}
                  </div>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default SwapInterface;

