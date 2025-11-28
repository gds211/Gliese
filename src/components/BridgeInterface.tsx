// src/components/BridgeInterface.tsx
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import bridgeIcon from "@/assets/bridge-icon.svg";

import WormholeConnect from "@wormhole-foundation/wormhole-connect";
import { wormholeConfig, wormholeTheme } from "@/config/wormhole";

const BridgeInterface = () => {
  return (
    <Card className="w-full max-w-md mx-auto bg-muted/40 backdrop-blur-md border border-muted/60 shadow-2xl">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <img
            src={bridgeIcon}
            alt="Bridge"
            className="h-6 w-6 rounded-full"
          />
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight">
              Bridge
            </span>
            <span className="text-xs text-muted-foreground">
              Cross-chain transfers via Wormhole
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Wormhole bridge widget inside your existing card shell */}
        <div className="rounded-2xl overflow-hidden border border-muted/60 bg-background/60">
          <WormholeConnect config={wormholeConfig} theme={wormholeTheme} />
        </div>
      </CardContent>
    </Card>
  );
};

export default BridgeInterface;
