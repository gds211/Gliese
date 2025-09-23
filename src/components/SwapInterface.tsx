import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogOverlay } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowUpDown, Wallet, Search, ChevronDown } from "lucide-react";
import { useAccount, useBalance } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import glieseLogo from "@/assets/gliese-logo.png";
import { formatUnits, parseUnits } from "viem";

const SwapInterface = () => {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  
  const [sellAmount, setSellAmount] = useState("");
  const [buyAmount, setBuyAmount] = useState("0");
  const [sellToken, setSellToken] = useState("MON");
  const [buyToken, setBuyToken] = useState("USDC");
  const [priceRate, setPriceRate] = useState("1 MON = 0.00215 USDC");
  
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenSelectionType, setTokenSelectionType] = useState<'sell' | 'buy'>('sell');
  const [searchTerm, setSearchTerm] = useState("");

  const cryptoPrices = {
    MON: 0.00215,
    USDC: 1.0,
    USDT: 1.0,
    CHOG: 16.0,
    DAK: 2650.0,
    aprMON: 0.00214
  };

  const tokens = [
    { symbol: "MON", name: "monad", price: cryptoPrices.MON },
    { symbol: "USDC", name: "USD Coin", price: cryptoPrices.USDC, address: "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea" as `0x${string}`},
    { symbol: "USDT", name: "Tether USD", price: cryptoPrices.USDT, address: "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D" as `0x${string}`},
    { symbol: "CHOG", name: "chog", price: cryptoPrices.CHOG, address: "0xE0590015A873bF326bd645c3E1266d4db41C4E6B" as `0x${string}`},
    { symbol: "DAK", name: "Mollandak", price: cryptoPrices.DAK, address: "0x0F0BDEbF0F83cD1EE3974779Bcb7315f9808c714" as `0x${string}`},
    { symbol: "aprMON", name: "apriori MON", price: cryptoPrices.aprMON, address: "0xb2f82D0f38dc453D596Ad40A37799446Cc89274A" as `0x${string}`}
  ];

  // === Live Balance for selected SELL token (native MON vs ERC-20) ===
  const selectedSellToken = useMemo(() => tokens.find(t => t.symbol === sellToken), [sellToken]);
  // Treat MON (native) as native even if tokens[] has an address string
  const isNativeSell = useMemo(
    () => selectedSellToken ? (selectedSellToken.symbol === "MON" || !selectedSellToken.address) : false,
    [selectedSellToken]
  );

  const { data: sellBal, isLoading: sellBalLoading } = useBalance({
    address,
    token: isNativeSell ? undefined : (selectedSellToken?.address as `0x${string}` | undefined),
    enabled: Boolean(isConnected && address && selectedSellToken),
  });

  // Helper: format bigint to a trimmed decimal string (max 6 fractional digits)
  function formatAmount(raw: bigint, decimals: number, maxFrac: number = 6): string {
    const full = formatUnits(raw, decimals);
    const [w, f = ""] = full.split(".");
    if (maxFrac <= 0 || f.length === 0) return w;
    const clamped = f.slice(0, maxFrac).replace(/0+$/, "");
    return clamped ? `${w}.${clamped}` : w;
  }

  // Flag: user-entered amount exceeds available balance (compares using token decimals)
  const isExceeding = useMemo(() => {
    if (!isConnected || !sellBal || !sellAmount) return false;
    try {
      const wantRaw = parseUnits(sellAmount, sellBal.decimals);
      return wantRaw > sellBal.value;
    } catch {
      // while typing invalid formats (e.g., "."), don't flash red
      return false;
    }
  }, [isConnected, sellBal?.value, sellBal?.decimals, sellAmount]);

  const filteredTokens = tokens.filter(token => 
    token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    token.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calculateUSDValue = (amount: string, token: string): string => {
    const numAmount = parseFloat(amount) || 0;
    const price = cryptoPrices[token as keyof typeof cryptoPrices] || 0;
    const usdValue = numAmount * price;
    return usdValue < 0.01 && usdValue > 0 ? `$${usdValue.toFixed(6)}` : `$${usdValue.toFixed(2)}`;
  };

  const formatAddress = (address: string): string => `${address.slice(0, 6)}...${address.slice(-6)}`;

  const handleSwapTokens = () => {
    // Swap tokens
    const tempToken = sellToken;
    setSellToken(buyToken);
    setBuyToken(tempToken);
    
    // Swap amounts
    const tempAmount = sellAmount;
    setSellAmount(buyAmount);
    setBuyAmount(tempAmount);
  };

  const openTokenModal = (type: 'sell' | 'buy') => {
    setTokenSelectionType(type);
    setShowTokenModal(true);
    setSearchTerm("");
  };

  const selectToken = (token: string) => {
    if (tokenSelectionType === 'sell') {
      setSellToken(token);
      setSellAmount(""); // reset typed amount when switching sell token to avoid wrong decimals
    } else {
      setBuyToken(token);
    }
    setShowTokenModal(false);
  };

  useEffect(() => {
    const updatePriceRate = () => {
      const sellPrice = cryptoPrices[sellToken as keyof typeof cryptoPrices] || 0;
      const buyPrice = cryptoPrices[buyToken as keyof typeof cryptoPrices] || 0;
      
      if (sellPrice > 0 && buyPrice > 0) {
        const exchangeRate = sellPrice / buyPrice;
        // Add small random variation
        const variation = (Math.random() - 0.5) * (exchangeRate * 0.001);
        const newRate = (exchangeRate + variation).toFixed(5);
        setPriceRate(`1 ${sellToken} = ${newRate} ${buyToken}`);
      }
    };

    updatePriceRate(); // Update immediately
    const interval = setInterval(updatePriceRate, 20000); // Update every 20 seconds
    
    return () => clearInterval(interval);
  }, [sellToken, buyToken]);

  return (
    <Card className="w-full max-w-md mx-auto bg-muted/40 backdrop-blur-md border border-muted/60 shadow-2xl">
      <div className="p-4 space-y-4">
        {/* Tabs */}
        <Tabs defaultValue="instant" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-muted/40 h-10">
            <TabsTrigger value="instant" className="text-sm flex items-center gap-2 h-8 data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground">
              <span className="data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground">⚡</span> Instant
            </TabsTrigger>
            <TabsTrigger value="trigger" className="text-sm flex items-center gap-2 h-8 data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground">
              <span className="data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground">🔫</span> Trigger
            </TabsTrigger>
            <TabsTrigger value="recurring" className="text-sm flex items-center gap-2 h-8 data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground">
              <span className="data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground">🔄</span> Recurring
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
                    {sellBalLoading ? "…" : sellBal ? `${Number(sellBal.formatted).toFixed(4)} ${sellToken}` : `0.00 ${sellToken}` }
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
                      // keep small MON buffer when selling native to leave gas
                      const gasBufferRaw = (isNativeSell && sellBal.decimals != null) ? parseUnits("0.003", sellBal.decimals) : 0n;
                      const available = sellBal.value > gasBufferRaw ? (sellBal.value - gasBufferRaw) : 0n;
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
                    onClick={() => openTokenModal('sell')}
                    className="w-36 h-9 bg-muted/60 rounded-full text-foreground border border-white/10 hover:border-primary/60 hover:bg-muted/80 flex items-center justify-between"
                  >
                    <span>{sellToken}</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                  <Input 
                    value={sellAmount}
                    onChange={(e) => setSellAmount(e.target.value)}
                    className="!border-none !bg-transparent text-right flex-1 text-3xl font-medium tracking-tight pr-2 h-auto text-foreground !shadow-none !ring-0 !ring-offset-0"
                    style={{ color: isExceeding ? "#ef4444" : undefined }}
                    placeholder="0.00"
                  />
                </div>
                <div className="text-right text-sm text-muted-foreground pr-3 pb-3">
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
                    onClick={() => openTokenModal('buy')}
                    className="w-36 h-9 bg-muted/60 rounded-full text-foreground border border-white/10 hover:border-primary/60 hover:bg-muted/80 flex items-center justify-between"
                  >
                    <span>{buyToken}</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                  <Input 
                    value={(() => {
                      const sellPrice = cryptoPrices[sellToken as keyof typeof cryptoPrices] || 0;
                      const buyPrice = cryptoPrices[buyToken as keyof typeof cryptoPrices] || 0;
                      const sellAmountNum = parseFloat(sellAmount) || 0;
                      if (sellPrice > 0 && buyPrice > 0 && sellAmountNum > 0) {
                        const calculatedAmount = (sellAmountNum * sellPrice) / buyPrice;
                        return calculatedAmount.toFixed(6);
                      }
                      return buyAmount;
                    })()}
                    onChange={(e) => setBuyAmount(e.target.value)}
                    className="!border-none !bg-transparent text-right flex-1 text-3xl font-medium tracking-tight pr-2 h-auto text-foreground !shadow-none !ring-0 !ring-offset-0"
                    placeholder="0.00"
                    readOnly
                  />
                </div>
                <div className="text-right text-sm text-muted-foreground pr-3 pb-3">
                  {calculateUSDValue(buyAmount, buyToken)}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div>Rate: {priceRate}</div>
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

        {/* Connect/Swap Button */}
        <div className="w-full mt-4">
          {!isConnected ? (
            <Button 
              className="w-full"
              onClick={() => openConnectModal?.()}
            >
              Connect Wallet
            </Button>
          ) : (
            <Button 
              className="w-full"
              disabled={!sellAmount || sellAmount === "0" || sellAmount === "0.0" || isExceeding}
            >
              {isExceeding
                ? "Amount exceeds balance"
                : (!sellAmount || sellAmount === "0" || sellAmount === "0.0" ? "Enter an amount" : "Swap")}
            </Button>
          )}
        </div>
      </div>

      {/* Token Selection Modal */}
      <Dialog open={showTokenModal} onOpenChange={setShowTokenModal}>
        <DialogOverlay />
        <DialogContent className="sm:max-w-[420px] bg-[#0b0f17]/95 border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              Select a token to {tokenSelectionType === 'sell' ? 'sell' : 'buy'}
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
