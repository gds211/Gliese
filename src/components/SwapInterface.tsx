import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { ArrowUpDown } from "lucide-react";

const SwapInterface = () => {
  const [sellAmount, setSellAmount] = useState("0.0925");
  const [buyAmount, setBuyAmount] = useState("0.0002");
  const [sellToken, setSellToken] = useState("MON");
  const [buyToken, setBuyToken] = useState("USDC");

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
                  <Button variant="ghost" size="sm" className="h-5 px-2 text-xs">
                    HALF
                  </Button>
                  <Button variant="ghost" size="sm" className="h-5 px-2 text-xs">
                    MAX
                  </Button>
                </div>
              </div>
              <div className="relative bg-background/60 rounded-xl border border-border/60 p-4">
                <div className="flex items-center justify-between mb-2">
                  <Select value={sellToken} onValueChange={setSellToken}>
                    <SelectTrigger className="w-28 h-8 bg-muted/60 rounded-full border-none p-2 focus:ring-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MON">MON</SelectItem>
                      <SelectItem value="ETH">ETH</SelectItem>
                      <SelectItem value="BTC">BTC</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input 
                    value={sellAmount}
                    onChange={(e) => setSellAmount(e.target.value)}
                    className="border-none bg-transparent text-right text-3xl font-semibold focus-visible:ring-0 p-0 h-auto text-muted-foreground"
                    placeholder="0.00"
                  />
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  $0
                </div>
              </div>
            </div>

            {/* Swap Arrow */}
            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 bg-background/60 hover:bg-background/80 rounded-md"
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </div>

            {/* Buying Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm text-muted-foreground">Buying</label>
                <span className="text-xs text-muted-foreground">≈ 0.09255339 SOL</span>
              </div>
              <div className="relative bg-background/60 rounded-xl border border-border/60 p-4">
                <div className="flex items-center justify-between mb-2">
                  <Select value={buyToken} onValueChange={setBuyToken}>
                    <SelectTrigger className="w-28 h-8 bg-muted/60 rounded-full border-none p-2 focus:ring-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USDC">USDC</SelectItem>
                      <SelectItem value="USDT">USDT</SelectItem>
                      <SelectItem value="DAI">DAI</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="text-right">
                    <div className="text-3xl font-semibold text-muted-foreground">0.00</div>
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