import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { ArrowUpDown } from "lucide-react";
import glieseLogo from "@/assets/gliese-logo.png";

const SwapInterface = () => {
  const [sellAmount, setSellAmount] = useState("0.0925");
  const [buyAmount, setBuyAmount] = useState("0.0002");
  const [sellToken, setSellToken] = useState("MON");
  const [buyToken, setBuyToken] = useState("USDC");
  const [priceRate, setPriceRate] = useState("1 MON = 0.00215 USDC");

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

  useEffect(() => {
    const updatePriceRate = () => {
      // Simulate price rate updates with random variations
      const baseRate = 0.00215;
      const variation = (Math.random() - 0.5) * 0.0001;
      const newRate = (baseRate + variation).toFixed(5);
      setPriceRate(`1 ${sellToken} = ${newRate} ${buyToken}`);
    };

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
                  <span>≈ 0.00 USDC</span>
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
                  <Select value={sellToken} onValueChange={setSellToken}>
                    <SelectTrigger className="w-28 h-8 bg-muted/60 rounded-full border-none p-2 focus:ring-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MON">MON</SelectItem>
                      <SelectItem value="USDC">USDC</SelectItem>
                      <SelectItem value="USDT">USDT</SelectItem>
                      <SelectItem value="DAI">DAI</SelectItem>
                      <SelectItem value="ETH">ETH</SelectItem>
                      <SelectItem value="BTC">BTC</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Input 
                      value={sellAmount}
                      onChange={(e) => setSellAmount(e.target.value)}
                      className="!border-none !bg-transparent text-right text-4xl font-semibold !focus-visible:ring-0 !focus:ring-0 !outline-none pr-2 h-auto text-foreground !shadow-none !ring-0 !ring-offset-0"
                      placeholder="0.00"
                    />
                    <span className="text-sm text-muted-foreground">
                      ${(parseFloat(sellAmount || "0") * 0.00215).toFixed(2)}
                    </span>
                  </div>
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
                  <Select value={buyToken} onValueChange={setBuyToken}>
                    <SelectTrigger className="w-28 h-8 bg-muted/60 rounded-full border-none p-2 focus:ring-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MON">MON</SelectItem>
                      <SelectItem value="USDC">USDC</SelectItem>
                      <SelectItem value="USDT">USDT</SelectItem>
                      <SelectItem value="DAI">DAI</SelectItem>
                      <SelectItem value="ETH">ETH</SelectItem>
                      <SelectItem value="BTC">BTC</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="text-right">
                    <div className="text-4xl font-semibold text-muted-foreground">0.00</div>
                  </div>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  $0
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
    </Card>
  );
};

export default SwapInterface;