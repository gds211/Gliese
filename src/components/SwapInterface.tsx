import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowUpDown, Wallet, Search, ChevronDown } from "lucide-react";
import glieseLogo from "@/assets/gliese-logo.png";

const SwapInterface = () => {
  const [sellAmount, setSellAmount] = useState("0.0925");
  const [buyAmount, setBuyAmount] = useState("0.0002");
  const [sellToken, setSellToken] = useState("MON");
  const [buyToken, setBuyToken] = useState("USDC");
  const [priceRate, setPriceRate] = useState("1 MON = 0.00215 USDC");
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenSelectionType, setTokenSelectionType] = useState<'sell' | 'buy'>('sell');
  const [searchTerm, setSearchTerm] = useState("");
  
  // Mock crypto prices in USD
  const cryptoPrices = {
    MON: 0.00215,
    USDC: 1.0,
    USDT: 1.0,
    DAI: 1.0,
    ETH: 2650.0,
    BTC: 43500.0
  };

  const tokens = [
    { symbol: "MON", name: "MON Token", price: cryptoPrices.MON },
    { symbol: "USDC", name: "USD Coin", price: cryptoPrices.USDC },
    { symbol: "USDT", name: "Tether USD", price: cryptoPrices.USDT },
    { symbol: "DAI", name: "Dai Stablecoin", price: cryptoPrices.DAI },
    { symbol: "ETH", name: "Ethereum", price: cryptoPrices.ETH },
    { symbol: "BTC", name: "Bitcoin", price: cryptoPrices.BTC }
  ];

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
                    0.00 {sellToken}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-5 px-2 text-xs text-muted-foreground bg-muted border border-muted-foreground/40 rounded hover:text-primary hover:border-primary hover:bg-muted transition-all duration-200"
                  >
                    HALF
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-5 px-2 text-xs text-muted-foreground bg-muted border border-muted-foreground/40 rounded hover:text-primary hover:border-primary hover:bg-muted transition-all duration-200"
                  >
                    MAX
                  </Button>
                </div>
              </div>
              <div className="relative bg-background/60 rounded-xl border border-border/60 p-4 focus-within:border-white transition-colors duration-200">
                <div className="flex items-center justify-between mb-2">
                  <Button
                    variant="ghost"
                    onClick={() => openTokenModal('sell')}
                    className="w-28 h-8 bg-muted/60 rounded-full border-none p-2 hover:bg-muted/80 flex items-center justify-between"
                  >
                    <span>{sellToken}</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                  <Input 
                    value={sellAmount}
                    onChange={(e) => setSellAmount(e.target.value)}
                    className="!border-none !bg-transparent text-right text-[8rem] font-semibold !focus-visible:ring-0 !focus:ring-0 !outline-none pr-2 h-auto text-foreground !shadow-none !ring-0 !ring-offset-0"
                    placeholder="0.00"
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
                    onClick={() => openTokenModal('buy')}
                    className="w-28 h-8 bg-muted/60 rounded-full border-none p-2 hover:bg-muted/80 flex items-center justify-between"
                  >
                    <span>{buyToken}</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                  <div className="text-right">
                    <div className="text-4xl font-semibold text-muted-foreground">0.00</div>
                  </div>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  {calculateUSDValue(buyAmount, buyToken)}
                </div>
              </div>
            </div>

            {/* Swap Button */}
            <Button 
              className="w-full h-12 mt-6 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              disabled={!sellAmount || sellAmount === "0" || sellAmount === "0.0"}
            >
              {!sellAmount || sellAmount === "0" || sellAmount === "0.0" ? "Enter an amount" : "Swap"}
            </Button>

            {/* Footer Info */}
            <div className="flex items-center justify-between px-4 mt-32 text-xs text-muted-foreground">
              <span>{priceRate}</span>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 border-2 border-border px-2 py-1 rounded-lg">
                  <img src={glieseLogo} alt="Gliese" className="w-4 h-4 rounded-lg" />
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
        <DialogContent className="max-w-md mx-auto backdrop-blur-xl border border-white/10 shadow-2xl" style={{ backgroundColor: '#000' }}>
          <DialogHeader className="pb-4">
            <DialogTitle className="text-lg font-semibold text-white">Select Token</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/60" />
              <Input
                placeholder="Search any token. Include '0x' for exact match."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/5 border border-white/20 text-white placeholder:text-white/40 focus:border-white/40 focus:bg-white/10"
              />
            </div>
            
            {/* Token List */}
            <ScrollArea className="h-[28rem] w-full pr-4">
              <div className="space-y-1">
                {filteredTokens.map((token, index) => (
                  <Button
                    key={token.symbol}
                    variant="ghost"
                    onClick={() => selectToken(token.symbol)}
                    className="w-full justify-start py-4 pl-10 pr-4 h-auto hover:bg-white/5 rounded-lg group"
                  >
                    <div className="flex items-center w-full">
                      {/* Token Icon */}
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                        {token.symbol.charAt(0)}
                      </div>
                      
                      {/* Token Info - positioned 8px after avatar */}
                      <div className="flex-1 text-left ml-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-white">{token.symbol}</span>
                          <div className="w-1 h-1 bg-green-400 rounded-full"></div>
                          <span className="text-xs text-green-400 font-medium">{Math.floor(Math.random() * 100)}</span>
                        </div>
                        <div className="text-xs text-white/60">{token.name}</div>
                        <div className="text-xs text-white/40">
                          ${token.price.toLocaleString()} · {Math.random() > 0.5 ? '+' : '-'}{(Math.random() * 10).toFixed(2)}%
                        </div>
                      </div>
                      
                      {/* Right side info */}
                      <div className="text-right">
                        <div className="text-xs text-white/60">
                          ${(Math.random() * 1000000).toFixed(0)}
                        </div>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default SwapInterface;