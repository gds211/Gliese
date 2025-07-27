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
    <Card className="w-full max-w-lg mx-auto bg-muted/10 backdrop-blur-md border border-muted/30 shadow-2xl">
      <div className="p-8 space-y-6">
        {/* Tabs */}
        <Tabs defaultValue="instant" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-muted/30">
            <TabsTrigger value="instant" className="text-sm flex items-center gap-1">
              <span>⚡</span> Instant
            </TabsTrigger>
            <TabsTrigger value="trigger" className="text-sm flex items-center gap-1">
              <span>🔫</span> Trigger
            </TabsTrigger>
            <TabsTrigger value="recurring" className="text-sm flex items-center gap-1">
              <span>🔄</span> Recurring
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="instant" className="mt-6 space-y-4">
            {/* Selling Section */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Selling</label>
              <div className="flex gap-2">
                <Select value={sellToken} onValueChange={setSellToken}>
                  <SelectTrigger className="w-32 bg-background/50 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MON">MON</SelectItem>
                    <SelectItem value="ETH">ETH</SelectItem>
                    <SelectItem value="BTC">BTC</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex-1 relative">
                  <Input 
                    value={sellAmount}
                    onChange={(e) => setSellAmount(e.target.value)}
                    className="bg-background/50 border-border/50 text-right pr-12"
                  />
                  <button className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground">
                    MAX
                  </button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground text-right">
                $0.01
              </div>
            </div>

            {/* Swap Arrow */}
            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full h-8 w-8 p-0 bg-background/50 hover:bg-background/70"
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </div>

            {/* Buying Section */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Buying</label>
              <div className="flex gap-2">
                <Select value={buyToken} onValueChange={setBuyToken}>
                  <SelectTrigger className="w-32 bg-background/50 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USDC">USDC</SelectItem>
                    <SelectItem value="USDT">USDT</SelectItem>
                    <SelectItem value="DAI">DAI</SelectItem>
                  </SelectContent>
                </Select>
                <Input 
                  value={buyAmount}
                  onChange={(e) => setBuyAmount(e.target.value)}
                  className="flex-1 bg-background/50 border-border/50"
                />
              </div>
              <div className="text-xs text-muted-foreground text-right">
                $0.0098
              </div>
            </div>

            {/* Swap Button */}
            <Button className="w-full mt-6 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
              Swap
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