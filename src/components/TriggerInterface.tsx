import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogOverlay } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { ChevronDown, Wallet, Search } from "lucide-react";
import TokenAvatar from "@/components/TokenAvatar";
import { useAccount, useBalance } from "wagmi";
import { parseUnits } from "viem";
import glieseLogo from "@/assets/gliese-logo.png";

interface Token {
  symbol: string;
  name: string;
  address?: `0x${string}`;
}

interface TriggerInterfaceProps {
  tokens: Token[];
}

const TriggerInterface = ({ tokens }: TriggerInterfaceProps) => {
  const { address, isConnected } = useAccount();
  
  const [payToken, setPayToken] = useState("MON");
  const [receiveToken, setReceiveToken] = useState("USDC");
  const [payAmount, setPayAmount] = useState("");
  const [rate, setRate] = useState("");
  const [expiry, setExpiry] = useState("1h");
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenSelectionType, setTokenSelectionType] = useState<"pay" | "receive">("pay");
  const [searchTerm, setSearchTerm] = useState("");
  const [tradeMode, setTradeMode] = useState<"optimized" | "exact">("optimized");

  const selectedPayToken = useMemo(
    () => tokens.find((t) => t.symbol === payToken),
    [tokens, payToken]
  );
  
  const selectedReceiveToken = useMemo(
    () => tokens.find((t) => t.symbol === receiveToken),
    [tokens, receiveToken]
  );

  const isNativePay = useMemo(
    () => !!selectedPayToken && (selectedPayToken.symbol === "MON" || !selectedPayToken.address),
    [selectedPayToken]
  );

  const { data: payBalance } = useBalance({
    address,
    token: isNativePay ? undefined : (selectedPayToken?.address as `0x${string}` | undefined),
    query: { enabled: Boolean(isConnected && address && selectedPayToken) },
  });

  const isNativeReceive = useMemo(
    () => !!selectedReceiveToken && (selectedReceiveToken.symbol === "MON" || !selectedReceiveToken.address),
    [selectedReceiveToken]
  );

  const { data: receiveBalance } = useBalance({
    address,
    token: isNativeReceive ? undefined : (selectedReceiveToken?.address as `0x${string}` | undefined),
    query: { enabled: Boolean(isConnected && address && selectedReceiveToken) },
  });

  const isExceeding = useMemo(() => {
    if (!isConnected || !payBalance || !payAmount) return false;
    try {
      const wantRaw = parseUnits(payAmount, payBalance.decimals);
      return wantRaw > payBalance.value;
    } catch {
      return false; // while typing invalid formats
    }
  }, [isConnected, payBalance?.value, payBalance?.decimals, payAmount]);

  const filteredTokens = tokens.filter(
    (t) =>
      t.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  function formatAddress(addr: string): string {
    return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
  }

  const handleSwapTokens = () => {
    const temp = payToken;
    setPayToken(receiveToken);
    setReceiveToken(temp);
    setPayAmount("");
    setRate("");
  };

  const handleMax = () => {
    if (payBalance) {
      setPayAmount(payBalance.formatted);
    }
  };

  const handleHalf = () => {
    if (payBalance) {
      const half = (Number(payBalance.formatted) / 2).toString();
      setPayAmount(half);
    }
  };

  const openTokenModal = (type: "pay" | "receive") => {
    setTokenSelectionType(type);
    setShowTokenModal(true);
    setSearchTerm("");
  };

  const selectToken = (token: Token) => {
    // Get the other token for comparison
    const otherToken = tokenSelectionType === "pay" ? selectedReceiveToken : selectedPayToken;
    
    // Check if user selected the same token as the other side
    const isSameToken = token.symbol === otherToken?.symbol;
    
    // If same token selected, swap them instead
    if (isSameToken) {
      handleSwapTokens();
      setShowTokenModal(false);
      return;
    }
    
    // Normal assignment
    if (tokenSelectionType === "pay") {
      setPayToken(token.symbol);
      setPayAmount("");
    } else {
      setReceiveToken(token.symbol);
    }
    setShowTokenModal(false);
  };

  const calculateReceiveAmount = () => {
    if (!payAmount || !rate) return "0.00";
    const amount = Number(payAmount) * Number(rate);
    if (amount === 0) return "0.00";
    // Show up to 6 decimals, but remove trailing zeros
    return amount.toFixed(6).replace(/\.?0+$/, '');
  };

  const payUsdValue = payAmount ? `~$${(Number(payAmount) * 1).toFixed(2)}` : "~$0.00";
  const receiveUsdValue = calculateReceiveAmount() 
    ? `~$${Number(calculateReceiveAmount()).toFixed(2)}` 
    : "~$0.00";

  const getButtonText = () => {
    if (!isConnected) return "Connect Wallet";
    if (isExceeding) return "Amount exceeds balance";
    if (!payAmount || payAmount === "0" || Number(payAmount) === 0) return "Enter an amount";
    if (!rate || rate === "0" || Number(rate) === 0) return "Enter an amount";
    return "Place trigger order";
  };

  return (
    <div className="space-y-2">
      {/* You pay section */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Selling</span>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Wallet className="h-3 w-3" />
              {payBalance ? `${Number(payBalance.formatted).toFixed(4)} ${payToken}` : `0.0000 ${payToken}`}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-2 text-xs text-muted-foreground bg-background/40 hover:bg-background/40 border border-border/40 hover:border-orange-500 hover:text-orange-500 transition-all duration-200 rounded"
              onClick={handleHalf}
            >
              HALF
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-2 text-xs text-muted-foreground bg-background/40 hover:bg-background/40 border border-border/40 hover:border-orange-500 hover:text-orange-500 transition-all duration-200 rounded"
              onClick={handleMax}
            >
              MAX
            </Button>
          </div>
        </div>

          <div className="relative bg-background/60 rounded-2xl border border-white/10 focus-within:border-primary/60 transition-colors duration-200 p-3">
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={() => openTokenModal("pay")}
              className="relative w-32 h-10 bg-muted/60 rounded-full text-foreground border border-white/10 hover:border-white hover:bg-muted/80 hover:text-white flex items-center"
              aria-label="Select pay token"
            >
              {/* Left logo */}
              <span className="absolute left-3 flex items-center gap-2 pointer-events-none">
                <TokenAvatar
                  symbol={payToken}
                  address={selectedPayToken?.address as `0x${string}` | undefined}
                  size={24}
                  title={selectedPayToken?.name || payToken}
                />
              </span>

              {/* Label centered between logo and chevron */}
              <span className="absolute inset-y-0 left-[2.75rem] right-[2.5rem] flex items-center justify-center pointer-events-none truncate">
                {payToken}
              </span>

              {/* Right chevron */}
              <ChevronDown className="absolute right-2 h-3.5 w-3.5 pointer-events-none" />
            </Button>

            <div className="flex-1 text-right">
              <Input
                type="text"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              placeholder="0.00"
                className="!border-none !bg-transparent text-right flex-1 !text-24 font-medium tracking-tight pr-2 h-auto text-foreground !shadow-none !ring-0 !ring-offset-0"
                style={{ color: isExceeding ? "#ef4444" : undefined }}
              />
            </div>
          </div>
          <div className="flex justify-end items-center mt-2">
            <span className="text-xs text-muted-foreground">{payUsdValue}</span>
          </div>
          </div>
      </div>

      {/* You receive section */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Buying</span>
          <div className="flex items-center gap-2">
            <span className={`text-xs transition-colors ${tradeMode === "optimized" ? "text-orange-500 font-semibold" : "text-muted-foreground"}`}>
              OPTIMIZED
            </span>
            <div className="relative w-16">
              <Slider
                value={[tradeMode === "optimized" ? 0 : 100]}
                onValueChange={(values) => {
                  setTradeMode(values[0] < 50 ? "optimized" : "exact");
                }}
                max={100}
                step={50}
                className="[&>span>span]:bg-orange-500 [&>span>span:last-child]:border-orange-500"
              />
            </div>
            <span className={`text-xs transition-colors ${tradeMode === "exact" ? "text-orange-500 font-semibold" : "text-muted-foreground"}`}>
              EXACT
            </span>
          </div>
        </div>

        <Card className="p-3 bg-card/50 border-border">
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={() => openTokenModal("receive")}
              className="relative w-32 h-10 bg-muted/60 rounded-full text-foreground border border-white/10 hover:border-white hover:bg-muted/80 hover:text-white flex items-center"
              aria-label="Select receive token"
            >
              {/* Left logo */}
              <span className="absolute left-3 flex items-center gap-2 pointer-events-none">
                <TokenAvatar
                  symbol={receiveToken}
                  address={selectedReceiveToken?.address as `0x${string}` | undefined}
                  size={24}
                  title={selectedReceiveToken?.name || receiveToken}
                />
              </span>

              {/* Label centered between logo and chevron */}
              <span className="absolute inset-y-0 left-[2.75rem] right-[2.5rem] flex items-center justify-center pointer-events-none truncate">
                {receiveToken}
              </span>

              {/* Right chevron */}
              <ChevronDown className="absolute right-2 h-3.5 w-3.5 pointer-events-none" />
            </Button>

            <div className="flex-1 text-right">
              <div className="text-2xl font-semibold">
                {calculateReceiveAmount()}
              </div>
            </div>
          </div>
          <div className="flex justify-end items-center mt-2">
            <span className="text-xs text-muted-foreground">{receiveUsdValue}</span>
          </div>
        </Card>
      </div>

      {/* Rate section */}
      <Card className="p-4 bg-card/50 border-border space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Buy {receiveToken} at rate
              </span>
            </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-primary hover:bg-white transition-colors duration-200"
                onClick={() => {
                  console.log("Set to market clicked");
                }}
              >
                Set to market
              </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative bg-background/60 rounded-md border border-white/10 hover:border-primary/60 focus-within:border-primary/60 transition-colors duration-200 px-3 py-2 flex-1">
              <Input
                type="text"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="0.00"
                className="!border-none !bg-transparent w-full !text-base font-medium text-foreground !shadow-none !ring-0 !ring-offset-0 p-0"
              />
            </div>
            <span className="text-sm text-muted-foreground">{receiveToken}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Expires in</span>
            <Select value={expiry} onValueChange={setExpiry}>
            <SelectTrigger className="w-[120px] bg-muted/50 border-border hover:border-primary/60 transition-colors duration-200 focus:ring-0 focus:ring-offset-0">
              <SelectValue>
                {expiry === "1h" ? "1 Hour" : expiry === "1" ? "1 Day" : `${expiry} Days`}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-popover border-border" side="top">
              <SelectItem value="1h" className="focus:bg-transparent focus:text-white hover:text-white">1 Hour</SelectItem>
              <SelectItem value="1" className="focus:bg-transparent focus:text-white hover:text-white">1 Day</SelectItem>
              <SelectItem value="3" className="focus:bg-transparent focus:text-white hover:text-white">3 Days</SelectItem>
              <SelectItem value="7" className="focus:bg-transparent focus:text-white hover:text-white">7 Days</SelectItem>
              <SelectItem value="30" className="focus:bg-transparent focus:text-white hover:text-white">30 Days</SelectItem>
            </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 border-2 border-border px-2 py-1 rounded-lg">
              <img src={glieseLogo} alt="Gliese" className="w-4 h-4 rounded-lg" />
              <span>Wrapdrive v1.1</span>
            </div>
            <span>0.1% FEE</span>
          </div>
        </div>
      </Card>

      {/* Create order button */}
      <Button
        className="w-full"
        disabled={!isConnected || !payAmount || !rate || isExceeding}
      >
        {getButtonText()}
      </Button>

      {/* Token Selection Modal */}
      <Dialog open={showTokenModal} onOpenChange={setShowTokenModal}>
        <DialogOverlay />
        <DialogContent className="sm:max-w-[420px] bg-[#0b0f17]/95 border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              Select a token to {tokenSelectionType === "pay" ? "pay" : "receive"}
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
