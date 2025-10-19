import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogOverlay } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, Wallet, Search, ArrowDownUp } from "lucide-react";
import TokenAvatar from "@/components/TokenAvatar";
import { useAccount, useBalance } from "wagmi";
import glieseLogo from "@/assets/gliese-logo.png";

interface Token {
  symbol: string;
  name: string;
  address?: `0x${string}`;
}

interface RecurringInterfaceProps {
  tokens: Token[];
}

const RecurringInterface = ({ tokens }: RecurringInterfaceProps) => {
  const { address, isConnected } = useAccount();
  
  const [allocateToken, setAllocateToken] = useState("USDC");
  const [buyToken, setBuyToken] = useState("SOL");
  const [allocateAmount, setAllocateAmount] = useState("");
  const [frequency, setFrequency] = useState("1");
  const [timeUnit, setTimeUnit] = useState("minute");
  const [orderCount, setOrderCount] = useState("2");
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenSelectionType, setTokenSelectionType] = useState<"allocate" | "buy">("allocate");
  const [searchTerm, setSearchTerm] = useState("");

  const selectedAllocateToken = useMemo(
    () => tokens.find((t) => t.symbol === allocateToken),
    [tokens, allocateToken]
  );
  
  const selectedBuyToken = useMemo(
    () => tokens.find((t) => t.symbol === buyToken),
    [tokens, buyToken]
  );

  const isNativeAllocate = useMemo(
    () => !!selectedAllocateToken && (selectedAllocateToken.symbol === "MON" || !selectedAllocateToken.address),
    [selectedAllocateToken]
  );

  const { data: allocateBalance } = useBalance({
    address,
    token: isNativeAllocate ? undefined : (selectedAllocateToken?.address as `0x${string}` | undefined),
    query: { enabled: Boolean(isConnected && address && selectedAllocateToken) },
  });

  const isNativeBuy = useMemo(
    () => !!selectedBuyToken && (selectedBuyToken.symbol === "MON" || !selectedBuyToken.address),
    [selectedBuyToken]
  );

  const { data: buyBalance } = useBalance({
    address,
    token: isNativeBuy ? undefined : (selectedBuyToken?.address as `0x${string}` | undefined),
    query: { enabled: Boolean(isConnected && address && selectedBuyToken) },
  });

  const filteredTokens = tokens.filter(
    (t) =>
      t.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  function formatAddress(addr: string): string {
    return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
  }

  const handleSwapTokens = () => {
    const temp = allocateToken;
    setAllocateToken(buyToken);
    setBuyToken(temp);
    setAllocateAmount("");
  };

  const handleMax = () => {
    if (allocateBalance) {
      setAllocateAmount(allocateBalance.formatted);
    }
  };

  const handleHalf = () => {
    if (allocateBalance) {
      const half = (Number(allocateBalance.formatted) / 2).toString();
      setAllocateAmount(half);
    }
  };

  const openTokenModal = (type: "allocate" | "buy") => {
    setTokenSelectionType(type);
    setShowTokenModal(true);
    setSearchTerm("");
  };

  const selectToken = (token: Token) => {
    if (tokenSelectionType === "allocate") {
      setAllocateToken(token.symbol);
      setAllocateAmount("");
    } else {
      setBuyToken(token.symbol);
    }
    setShowTokenModal(false);
  };

  const calculateBuyAmount = () => {
    if (!allocateAmount || !orderCount) return "0.00";
    // Mock calculation - divide total by number of orders for display
    const perOrder = Number(allocateAmount) / Number(orderCount);
    return perOrder.toFixed(8);
  };

  const allocateUsdValue = allocateAmount ? `~$${(Number(allocateAmount) * 1).toFixed(2)}` : "~$0.00";

  const getButtonText = () => {
    if (!isConnected) return "Connect Wallet";
    if (!allocateAmount || allocateAmount === "0" || Number(allocateAmount) === 0) return "Enter an amount";
    return "Create recurring order";
  };

  return (
    <div className="space-y-4">
      {/* I Want To Allocate section */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">I Want To Allocate</span>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Wallet className="h-3 w-3" />
              {allocateBalance ? `${Number(allocateBalance.formatted).toFixed(4)} ${allocateToken}` : `0.0000 ${allocateToken}`}
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
              onClick={() => openTokenModal("allocate")}
              className="relative w-32 h-10 bg-muted/60 rounded-full text-foreground border border-white/10 hover:border-white hover:bg-muted/80 hover:text-white flex items-center"
              aria-label="Select allocate token"
            >
              <span className="absolute left-3 flex items-center gap-2 pointer-events-none">
                <TokenAvatar
                  symbol={allocateToken}
                  address={selectedAllocateToken?.address as `0x${string}` | undefined}
                  size={24}
                  title={selectedAllocateToken?.name || allocateToken}
                />
              </span>
              <span className="absolute inset-y-0 left-[2.75rem] right-[2.5rem] flex items-center justify-center pointer-events-none truncate">
                {allocateToken}
              </span>
              <ChevronDown className="absolute right-2 h-3.5 w-3.5 pointer-events-none" />
            </Button>

            <div className="flex-1 text-right">
              <Input
                type="text"
                value={allocateAmount}
                onChange={(e) => setAllocateAmount(e.target.value)}
                placeholder="0.00"
                className="!border-none !bg-transparent text-right flex-1 !text-24 font-medium tracking-tight pr-2 h-auto text-foreground !shadow-none !ring-0 !ring-offset-0"
              />
            </div>
          </div>
          <div className="flex justify-end items-center mt-2">
            <span className="text-xs text-muted-foreground">{allocateUsdValue}</span>
          </div>
        </div>
      </div>

      {/* Swap Arrow */}
      <div className="flex justify-center -my-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSwapTokens}
          className="h-8 w-8 rounded-full bg-muted/60 hover:bg-muted/80 border border-white/10 hover:border-white transition-all"
          aria-label="Swap tokens"
        >
          <ArrowDownUp className="h-4 w-4" />
        </Button>
      </div>

      {/* To Buy section */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">To Buy</span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Wallet className="h-3 w-3" />
            {buyBalance ? `${Number(buyBalance.formatted).toFixed(4)} ${buyToken}` : `0.0000 ${buyToken}`}
          </span>
        </div>

        <div className="relative bg-background/60 rounded-2xl border border-white/10 p-3">
          <div className="flex items-center justify-between gap-3">
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

            <div className="flex-1 text-right">
              <div className="text-xl font-semibold text-muted-foreground">
                {calculateBuyAmount()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Frequency and Duration controls */}
      <div className="grid grid-cols-2 gap-3">
        {/* Every section */}
        <div className="space-y-2">
          <span className="text-sm text-muted-foreground">Every</span>
          <div className="flex items-center gap-2">
            <div className="relative bg-background/60 rounded-md border border-white/10 hover:border-primary/60 focus-within:border-primary/60 transition-colors duration-200 px-3 py-2 flex-1">
              <Input
                type="text"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                placeholder="1"
                className="!border-none !bg-transparent w-full !text-2xl font-semibold text-foreground !shadow-none !ring-0 !ring-offset-0 p-0 text-center"
              />
            </div>
            <Select value={timeUnit} onValueChange={setTimeUnit}>
              <SelectTrigger className="w-[100px] bg-muted/50 border-border hover:border-primary/60 transition-colors duration-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="minute">minute</SelectItem>
                <SelectItem value="hour">hour</SelectItem>
                <SelectItem value="day">day</SelectItem>
                <SelectItem value="week">week</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Over section */}
        <div className="space-y-2">
          <span className="text-sm text-muted-foreground">Over</span>
          <div className="flex items-center gap-2">
            <div className="relative bg-background/60 rounded-md border border-white/10 hover:border-primary/60 focus-within:border-primary/60 transition-colors duration-200 px-3 py-2 flex-1">
              <Input
                type="text"
                value={orderCount}
                onChange={(e) => setOrderCount(e.target.value)}
                placeholder="2"
                className="!border-none !bg-transparent w-full !text-2xl font-semibold text-foreground !shadow-none !ring-0 !ring-offset-0 p-0 text-center"
              />
            </div>
            <span className="text-sm text-muted-foreground whitespace-nowrap">orders</span>
          </div>
        </div>
      </div>

      {/* Create order button */}
      <Button
        className="w-full"
        disabled={!isConnected || !allocateAmount}
      >
        {getButtonText()}
      </Button>

      {/* Token Selection Modal */}
      <Dialog open={showTokenModal} onOpenChange={setShowTokenModal}>
        <DialogOverlay />
        <DialogContent className="sm:max-w-[420px] bg-[#0b0f17]/95 border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              Select a token to {tokenSelectionType === "allocate" ? "allocate" : "buy"}
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

export default RecurringInterface;
