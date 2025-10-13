import { useState, useMemo } from "react";
import { useAccount, useBalance } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { parseUnits } from "viem";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogOverlay } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { ArrowUpDown, Search, ChevronDown } from "lucide-react";
import glieseLogo from "@/assets/gliese-logo.png";
import TokenAvatar from "@/components/TokenAvatar";

// Helper functions
function formatAmount(raw: bigint, decimals: number, maxFrac: number = 6): string {
  const full = (Number(raw) / 10 ** decimals).toString();
  const [w, f = ""] = full.split(".");
  if (maxFrac <= 0 || f.length === 0) return w;
  const clamped = f.slice(0, maxFrac).replace(/0+$/, "");
  return clamped ? `${w}.${clamped}` : w;
}

function formatAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
}

const TriggerInterface = () => {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  // Token list (matching SwapInterface)
  const tokens = [
    { symbol: "MON", name: "monad" },
    { symbol: "USDC", name: "Circle USD", address: "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea" as `0x${string}` },
    { symbol: "USDT", name: "Tether USD", address: "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D" as `0x${string}` },
    { symbol: "CHOG", name: "chog", address: "0xE0590015A873bF326bd645c3E1266d4db41C4E6B" as `0x${string}` },
    { symbol: "DAK", name: "Molandak", address: "0x0F0BDEbF0F83cD1EE3974779Bcb7315f9808c714" as `0x${string}` },
    { symbol: "aprMON", name: "apriori MON", address: "0xb2f82D0f38dc453D596Ad40A37799446Cc89274A" as `0x${string}` },
  ];

  // State
  const [sellAmount, setSellAmount] = useState("");
  const [sellToken, setSellToken] = useState("USDC");
  const [buyToken, setBuyToken] = useState("MON");
  const [targetRate, setTargetRate] = useState("");
  const [expiry, setExpiry] = useState("never");
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenSelectionType, setTokenSelectionType] = useState<"sell" | "buy">("sell");
  const [searchTerm, setSearchTerm] = useState("");

  const selectedSellToken = useMemo(() => tokens.find((t) => t.symbol === sellToken), [sellToken]);
  const selectedBuyToken = useMemo(() => tokens.find((t) => t.symbol === buyToken), [buyToken]);

  const isNativeSell = useMemo(
    () => !!selectedSellToken && (selectedSellToken.symbol === "MON" || !selectedSellToken.address),
    [selectedSellToken]
  );

  // Wallet balance for SELL token
  const { data: sellBal, isLoading: sellBalLoading } = useBalance({
    address,
    token: isNativeSell ? undefined : (selectedSellToken?.address as `0x${string}` | undefined),
    query: { enabled: Boolean(isConnected && address && selectedSellToken), refetchOnWindowFocus: false },
  });

  // Check if exceeding balance
  const isExceeding = useMemo(() => {
    if (!isConnected || !sellBal || !sellAmount) return false;
    try {
      const wantRaw = parseUnits(sellAmount, sellBal.decimals);
      return wantRaw > sellBal.value;
    } catch {
      return false;
    }
  }, [isConnected, sellBal?.value, sellBal?.decimals, sellAmount]);

  // Calculate buy amount based on target rate
  const buyAmountEstimate = useMemo(() => {
    const sell = Number(sellAmount);
    const rate = Number(targetRate);
    if (!Number.isFinite(sell) || !Number.isFinite(rate) || sell <= 0 || rate <= 0) return "0";
    const buy = sell / rate;
    return buy.toFixed(8).replace(/\.?0+$/, "");
  }, [sellAmount, targetRate]);

  // Filter tokens
  const filteredTokens = tokens.filter(
    (t) =>
      t.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handlers
  const handleSwapTokens = () => {
    const t = sellToken;
    setSellToken(buyToken);
    setBuyToken(t);
    setSellAmount("");
    setTargetRate("");
  };

  const openTokenModal = (type: "sell" | "buy") => {
    setTokenSelectionType(type);
    setShowTokenModal(true);
    setSearchTerm("");
  };

  const selectToken = (picked: any) => {
    const tokenObj = typeof picked === "string" ? tokens.find((t) => t.symbol === picked) : picked;
    if (!tokenObj) {
      setShowTokenModal(false);
      return;
    }

    if (tokenSelectionType === "sell") {
      setSellToken(tokenObj.symbol);
      setSellAmount("");
      setTargetRate("");
    } else {
      setBuyToken(tokenObj.symbol);
    }

    setShowTokenModal(false);
  };

  const handleCreateOrder = () => {
    if (!isConnected) {
      openConnectModal?.();
      return;
    }
    // TODO: Implement limit order creation
    console.log("Create limit order:", { sellToken, sellAmount, buyToken, targetRate, expiry });
  };

  return (
    <div className="space-y-3">
      {/* Selling Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm text-muted-foreground">Selling</label>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              {sellBalLoading ? "…" : sellBal ? `${Number(sellBal.formatted).toFixed(2)} ${sellToken}` : `0,00 ${sellToken}`}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-2 text-xs text-muted-foreground bg-background/40 hover:bg-background/40 border border-border/40 hover:border-orange-500 hover:text-orange-500 transition-all duration-200 rounded"
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
              className="h-5 px-2 text-xs text-muted-foreground bg-background/40 hover:bg-background/40 border border-border/40 hover:border-orange-500 hover:text-orange-500 transition-all duration-200 rounded"
              onClick={() => {
                if (!sellBal) return;
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
              className="relative w-32 h-10 bg-muted/60 rounded-full text-foreground border border-white/10 hover:border-white hover:bg-muted/80 hover:text-white flex items-center"
              aria-label="Select sell token"
            >
              <span className="absolute left-3 flex items-center gap-2 pointer-events-none">
                <TokenAvatar
                  symbol={sellToken}
                  address={selectedSellToken?.address as `0x${string}` | undefined}
                  size={24}
                  title={selectedSellToken?.name || sellToken}
                />
              </span>
              <span className="absolute inset-y-0 left-[2.75rem] right-[2.5rem] flex items-center justify-center pointer-events-none truncate">
                {sellToken}
              </span>
              <ChevronDown className="absolute right-2 h-3.5 w-3.5 pointer-events-none" />
            </Button>
            <Input
              value={sellAmount}
              onChange={(e) => setSellAmount(e.target.value)}
              className="!border-none !bg-transparent text-right flex-1 !text-24 font-medium tracking-tight pr-2 h-auto text-foreground !shadow-none !ring-0 !ring-offset-0"
              style={{ color: isExceeding ? "#ef4444" : undefined }}
              placeholder="0"
            />
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
        <div className="relative bg-background/60 rounded-2xl border border-white/10 transition-colors duration-200">
          <span className="absolute left-0 bottom-full mb-3 text-sm text-muted-foreground pointer-events-none select-none">
            Buying
          </span>
          <div className="absolute right-0 bottom-full mb-3 flex items-center gap-1.5 text-sm text-muted-foreground select-none">
            <span className="leading-none tabular-nums">{sellBal ? `${Number(sellBal.formatted).toFixed(8)} ${buyToken}` : `0,00000000 ${buyToken}`}</span>
          </div>
          <div className="flex items-center justify-between p-3">
            <Button
              variant="ghost"
              onClick={() => openTokenModal("buy")}
              className="relative w-32 h-10 bg-muted/60 rounded-full text-foreground border border-white/10 hover:border-white hover:bg-muted/80 hover:text-white flex items-center"
              aria-label="Select buy token"
            >
              <span className="absolute left-3 flex items-center gap-2 pointer-events-none">
                <TokenAvatar
                  symbol={buyToken}
                  address={selectedBuyToken?.address as `0x${string}` | undefined}
                  size={24}
                  title={selectedBuyToken?.name || buyToken}
                />
              </span>
              <span className="absolute inset-y-0 left-[2.75rem] right-[2.5rem] flex items-center justify-center pointer-events-none truncate">
                {buyToken}
              </span>
              <ChevronDown className="absolute right-2 h-3.5 w-3.5 pointer-events-none" />
            </Button>
            <Input
              value={buyAmountEstimate}
              readOnly
              className="!border-none !bg-transparent text-right flex-1 !text-24 font-medium tracking-tight pr-2 h-auto text-foreground !shadow-none !ring-0 !ring-offset-0"
              placeholder="0"
            />
          </div>
        </div>
      </div>

      {/* Rate & Expiry Section */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Buy {buyToken} at rate</label>
          <div className="relative bg-background/60 rounded-xl border border-white/10 focus-within:border-primary/60 transition-colors duration-200">
            <Input
              value={targetRate}
              onChange={(e) => setTargetRate(e.target.value)}
              className="!border-none !bg-transparent text-left px-3 py-2 text-sm font-medium text-foreground !shadow-none !ring-0 !ring-offset-0"
              placeholder="201,879498128"
            />
            <div className="px-3 pb-2 text-xs text-muted-foreground">≈ $201,84</div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-blue-500 hover:text-blue-400 hover:bg-transparent"
          >
            Use Market
          </Button>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Expiry</label>
          <Select value={expiry} onValueChange={setExpiry}>
            <SelectTrigger className="bg-background/60 border-white/10 h-[4.5rem]">
              <SelectValue placeholder="Never" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="never">Never</SelectItem>
              <SelectItem value="1hour">1 Hour</SelectItem>
              <SelectItem value="1day">1 Day</SelectItem>
              <SelectItem value="1week">1 Week</SelectItem>
              <SelectItem value="1month">1 Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Create Order Button */}
      <div className="w-full pt-2">
        <Button
          className="w-full"
          disabled={
            !isConnected ||
            !sellAmount ||
            sellAmount === "0" ||
            !targetRate ||
            targetRate === "0" ||
            isExceeding
          }
          onClick={handleCreateOrder}
        >
          {!isConnected
            ? "Connect Wallet"
            : isExceeding
            ? `Insufficient ${sellToken}`
            : !sellAmount || sellAmount === "0"
            ? "Enter an amount"
            : !targetRate || targetRate === "0"
            ? "Enter target rate"
            : "Create Order"}
        </Button>
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

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
            <Input
              placeholder="Search any token"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:border-white/40 focus:bg-white/10"
            />
          </div>

          <ScrollArea className="h-[26rem] w-full pr-4">
            <div className="space-y-2">
              {filteredTokens.map((token) => (
                <Button
                  key={token.address ? token.address.toLowerCase() : `symbol:${token.symbol}`}
                  variant="ghost"
                  className="w-full justify-between py-3 px-3 rounded-xl border border-white/10 hover:bg-white/5"
                  onClick={() => selectToken(token)}
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
    </div>
  );
};

export default TriggerInterface;
