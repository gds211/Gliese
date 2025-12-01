import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowUpDown, Wallet } from "lucide-react";
import bridgeIcon from "@/assets/bridge-icon.svg";
import wormholeLogo from "@/assets/wormhole-logo.svg";

const BridgeInterface = () => {
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const isConnected = false; // TODO: Connect to wallet state

  return (
    <Card className="w-full max-w-md mx-auto bg-muted/40 backdrop-blur-md border border-muted/60 shadow-2xl">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <img src={bridgeIcon} alt="Bridge" className="h-10 w-10" loading="eager" />
          <h2 className="text-lg font-semibold text-foreground">Bridge</h2>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* FROM Section */}
        <div className="relative bg-background/60 rounded-2xl border border-white/10 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              From
            </span>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Wallet className="h-3 w-3" />
              <span>0.00</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              className="h-12 bg-muted/60 rounded-full border border-white/10 hover:border-white/20 hover:bg-muted/80 transition-all pl-4 pr-5 gap-2.5"
            >
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                <span className="text-xs">•</span>
              </div>
              <span className="text-sm font-medium">Select</span>
            </Button>

            <Input
              type="text"
              value={fromAmount}
              onChange={(e) => setFromAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 text-right text-5xl font-semibold bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
            />
          </div>
        </div>

        {/* Swap Direction Button */}
        <div className="flex justify-center -my-2 relative z-10">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 bg-background/60 hover:bg-white rounded-md border border-border/40 hover:border-2 hover:border-blue-600 transition-colors duration-200"
          >
            <ArrowUpDown className="h-4 w-4 text-blue-600" />
          </Button>
        </div>

        {/* TO Section with Powered By info */}
        <div className="space-y-4">
          {/* TO Section */}
          <div className="relative bg-background/60 rounded-2xl border border-white/10 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">
                To
              </span>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Wallet className="h-3 w-3" />
                <span>0.00</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <Button
                variant="ghost"
                className="h-12 bg-muted/60 rounded-full border border-white/10 hover:border-white/20 hover:bg-muted/80 transition-all pl-4 pr-5 gap-2.5"
              >
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-xs">•</span>
                </div>
                <span className="text-sm font-medium">Select</span>
              </Button>

              <Input
                type="text"
                value={toAmount}
                onChange={(e) => setToAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1 text-right text-5xl font-semibold text-white bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
              />
            </div>
          </div>

          {/* Powered by Wormhole */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pb-1">
            <div className="flex items-center gap-1.5">
              <span>Powered by</span>
              <img 
                src={wormholeLogo} 
                alt="Wormhole" 
                className="h-2.5 w-auto" 
              />
            </div>
            <span>0% FEE</span>
          </div>
        </div>

        {/* Action Button */}
        <Button
          size="lg"
          className="w-full h-14 text-base font-semibold bg-primary hover:bg-primary/90 shadow-glow-cosmic"
          disabled={!isConnected}
        >
          Connect Source Wallet
        </Button>
      </CardContent>
    </Card>
  );
};

export default BridgeInterface;
