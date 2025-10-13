import { useState, useMemo } from "react";
import { useAccount, useBalance } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, Settings, Plus, Minus, Search } from "lucide-react";
import TokenAvatar from "@/components/TokenAvatar";

const TriggerInterface = () => {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  // Token list
  const tokens = [
    { symbol: "MON", name: "monad" },
    { symbol: "USDC", name: "Circle USD", address: "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea" as `0x${string}` },
    { symbol: "USDT", name: "Tether USD", address: "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D" as `0x${string}` },
    { symbol: "CHOG", name: "chog", address: "0xE0590015A873bF326bd645c3E1266d4db41C4E6B" as `0x${string}` },
    { symbol: "DAK", name: "Molandak", address: "0x0F0BDEbF0F83cD1EE3974779Bcb7315f9808c714" as `0x${string}` },
    { symbol: "aprMON", name: "apriori MON", address: "0xb2f82D0f38dc453D596Ad40A37799446Cc89274A" as `0x${string}` },
  ];

  // UI State
  const [orderType, setOrderType] = useState<"buy" | "sell">("buy");
  const [buyAmount, setBuyAmount] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [buyToken, setBuyToken] = useState("MON");
  const [payToken, setPayToken] = useState("USDC");
  const [limitRate, setLimitRate] = useState("");
  const [useMarketRate, setUseMarketRate] = useState(true);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenSelectionType, setTokenSelectionType] = useState<"buy" | "pay">("buy");
  const [searchTerm, setSearchTerm] = useState("");

  const selectedBuyToken = useMemo(() => tokens.find((t) => t.symbol === buyToken), [buyToken]);
  const selectedPayToken = useMemo(() => tokens.find((t) => t.symbol === payToken), [payToken]);

  const isNativeBuy = useMemo(
    () => !!selectedBuyToken && (selectedBuyToken.symbol === "MON" || !selectedBuyToken.address),
    [selectedBuyToken]
  );

  const isNativePay = useMemo(
    () => !!selectedPayToken && (selectedPayToken.symbol === "MON" || !selectedPayToken.address),
    [selectedPayToken]
  );

  // Balances
  const { data: buyBal } = useBalance({
    address,
    token: isNativeBuy ? undefined : (selectedBuyToken?.address as `0x${string}` | undefined),
    query: { enabled: Boolean(isConnected && address && selectedBuyToken), refetchOnWindowFocus: false },
  });

  const { data: payBal } = useBalance({
    address,
    token: isNativePay ? undefined : (selectedPayToken?.address as `0x${string}` | undefined),
    query: { enabled: Boolean(isConnected && address && selectedPayToken), refetchOnWindowFocus: false },
  });

  const filteredTokens = tokens.filter(
    (t) =>
      t.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openTokenModal = (type: "buy" | "pay") => {
    setTokenSelectionType(type);
    setShowTokenModal(true);
    setSearchTerm("");
  };

  const selectToken = (picked: string) => {
    const tokenObj = tokens.find((t) => t.symbol === picked);
    if (!tokenObj) {
      setShowTokenModal(false);
      return;
    }

    if (tokenSelectionType === "buy") {
      setBuyToken(tokenObj.symbol);
    } else {
      setPayToken(tokenObj.symbol);
    }
    setShowTokenModal(false);
  };

  const formatBalance = (balance: bigint | undefined, decimals?: number): string => {
    if (!balance || !decimals) return "0.0";
    const formatted = Number(balance) / 10 ** decimals;
    return formatted.toFixed(6).replace(/\.?0+$/, '');
  };

  const handleRateAdjust = (direction: "up" | "down") => {
    const current = Number(limitRate) || 0;
    const step = 0.00001;
    const newRate = direction === "up" ? current + step : Math.max(0, current - step);
    setLimitRate(newRate.toFixed(6));
    setUseMarketRate(false);
  };

  return (
    <>
      <div className="space-y-3">
        {/* Buy/Sell Tabs */}
        <div className="flex justify-between items-center">
          <Tabs value={orderType} onValueChange={(v) => setOrderType(v as "buy" | "sell")} className="w-auto">
            <TabsList className="bg-primary/20 h-9">
              <TabsTrigger value="buy" className="text-sm px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Buy
              </TabsTrigger>
              <TabsTrigger value="sell" className="text-sm px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Sell
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        {/* You buy section */}
        <Card className="bg-card/60 backdrop-blur-sm border-border/50 p-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-foreground">You {orderType}</span>
              <Button
                variant="ghost"
                onClick={() => openTokenModal("buy")}
                className="h-auto p-1 hover:bg-accent/10"
              >
                <div className="flex items-center gap-2">
                  <TokenAvatar symbol={buyToken} size={24} />
                  <span className="font-semibold text-foreground">{buyToken}</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              </Button>
            </div>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="0.0"
              value={buyAmount}
              onChange={(e) => setBuyAmount(e.target.value)}
              className="text-2xl font-bold bg-transparent border-none h-12 px-0 focus-visible:ring-0"
            />
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">$0.00</span>
              <span className="text-muted-foreground">
                Balance: {formatBalance(buyBal?.value, buyBal?.decimals)}
              </span>
            </div>
          </div>
        </Card>

        {/* You pay section */}
        <Card className="bg-card/60 backdrop-blur-sm border-border/50 p-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-foreground">You pay</span>
              <Button
                variant="ghost"
                onClick={() => openTokenModal("pay")}
                className="h-auto p-1 hover:bg-accent/10"
              >
                <div className="flex items-center gap-2">
                  <TokenAvatar symbol={payToken} size={24} />
                  <span className="font-semibold text-foreground">{payToken}</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              </Button>
            </div>
            <Input
              type="text"
              inputMode="decimal"
              placeholder="0.0"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className="text-2xl font-bold bg-transparent border-none h-12 px-0 focus-visible:ring-0"
            />
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">$0.00</span>
              <span className="text-muted-foreground">
                Balance: {formatBalance(payBal?.value, payBal?.decimals)} <span className="text-accent">Max</span>
              </span>
            </div>
          </div>
        </Card>

        {/* Rate section */}
        <Card className="bg-card/60 backdrop-blur-sm border-border/50 p-4">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-foreground">
                {orderType === "buy" ? "Buy" : "Sell"} {buyToken} at rate
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUseMarketRate(!useMarketRate)}
                className="text-xs text-accent hover:text-accent/80 h-auto p-1"
              >
                Set to market
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRateAdjust("down")}
                className="h-8 w-8 shrink-0"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0.0"
                value={limitRate}
                onChange={(e) => {
                  setLimitRate(e.target.value);
                  setUseMarketRate(false);
                }}
                className="text-center font-mono text-lg bg-transparent border-none h-8 focus-visible:ring-0"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRateAdjust("up")}
                className="h-8 w-8 shrink-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Warning message */}
        <div className="text-center py-2">
          <p className="text-xs text-muted-foreground">Select an amount for limit order</p>
        </div>

        {/* Action button */}
        <Card className="bg-muted/60 backdrop-blur-sm border-border/50 p-4 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            This pool doesn't support Limit Orders
          </p>
        </Card>
      </div>

      {/* Token Selection Modal */}
      <Dialog open={showTokenModal} onOpenChange={setShowTokenModal}>
        <DialogContent className="bg-card border-border shadow-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">Select a token</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or address"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-muted/50 border-border"
              />
            </div>
            <ScrollArea className="h-[300px]">
              <div className="space-y-1 pr-4">
                {filteredTokens.map((token) => (
                  <button
                    key={token.symbol}
                    onClick={() => selectToken(token.symbol)}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-accent/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <TokenAvatar symbol={token.symbol} size={32} />
                      <div className="text-left">
                        <div className="font-medium text-foreground">{token.symbol}</div>
                        <div className="text-xs text-muted-foreground">{token.name}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TriggerInterface;
