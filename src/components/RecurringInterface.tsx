import { useState, useMemo, type Dispatch, type SetStateAction } from "react";
import { Address, parseUnits } from "viem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogOverlay } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTokenSearch } from "@/hooks/useTokenSearch";
import { useConnectModal } from "@rainbow-me/rainbowkit";

import { ChevronDown, Wallet, Search, Loader2, Info } from "lucide-react";
import TokenAvatar from "@/components/TokenAvatar";
import { useAccount, useBalance } from "wagmi";
import glieseLogo from "@/assets/gliese-logo.png";
import verifiedBadge from "@/assets/verified-badge.svg";

interface Token {
  symbol: string;
  name?: string;
  address?: `0x${string}`;
  logoURI?: string;
}

interface RecurringInterfaceProps {
  tokens: Token[];
  payToken: string | null;
  setPayToken: (token: string | null) => void;
  receiveToken: string | null;
  setReceiveToken: (token: string | null) => void;
  extraTokens: Array<{ symbol: string; name?: string; address?: `0x${string}`; logoURI?: string }>;
  setExtraTokens: Dispatch<
    SetStateAction<Array<{ symbol: string; name?: string; address?: `0x${string}`; logoURI?: string }>>
  >;
}

// Helper component to display token balance
const TokenBalanceDisplay = ({ 
  tokenAddress, 
  walletAddress 
}: { 
  tokenAddress?: Address; 
  walletAddress?: Address;
}) => {
  const { formatted, isLoading } = useTokenBalance({
    address: walletAddress,
    token: tokenAddress,
  });

  if (!walletAddress) return <span className="text-xs text-white/50 font-medium tabular-nums">0.00</span>;
  if (isLoading) return <span className="text-xs text-white/50 font-medium tabular-nums">...</span>;
  
  return (
    <span className="text-xs text-white/50 font-medium tabular-nums">
      {formatted ? parseFloat(formatted).toFixed(2) : "0.00"}
    </span>
  );
};

const RecurringInterface = ({
  tokens,
  payToken,
  setPayToken,
  receiveToken,
  setReceiveToken,
  extraTokens,
  setExtraTokens,
}: RecurringInterfaceProps) => {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  
  const [payAmount, setPayAmount] = useState("");
  const [frequency, setFrequency] = useState("");
  const [frequencyUnit, setFrequencyUnit] = useState<"minute" | "hour" | "day" | "week">("day");
  const [totalOrders, setTotalOrders] = useState("");
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenSelectionType, setTokenSelectionType] = useState<"pay" | "receive">("pay");
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: searchResults = [], isLoading: searching } = useTokenSearch(searchTerm);
  const combinedTokens = useMemo(() => [...tokens, ...extraTokens], [tokens, extraTokens]);

  const selectedPayToken = useMemo(() => {
    if (payToken === null) return combinedTokens.find(t => !t.address);
    return combinedTokens.find(t => t.address?.toLowerCase() === payToken.toLowerCase());
  }, [combinedTokens, payToken]);

  const selectedReceiveToken = useMemo(() => {
    if (receiveToken === null) return combinedTokens.find(t => !t.address);
    return combinedTokens.find(t => t.address?.toLowerCase() === receiveToken.toLowerCase());
  }, [combinedTokens, receiveToken]);

  const isNativePay = useMemo(
    () => !!selectedPayToken && (selectedPayToken.symbol === "MON" || !selectedPayToken.address),
    [selectedPayToken]
  );

  const { data: payBalance } = useBalance({
    address,
    token: isNativePay ? undefined : (selectedPayToken?.address as Address | undefined),
  });

  // Numeric input validation
  const handleNumericInput = (value: string) => {
    return value.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");
  };

  const handlePayAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPayAmount(handleNumericInput(e.target.value));
  };

  const handleFrequencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFrequency(handleNumericInput(e.target.value));
  };

  const handleOrdersChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTotalOrders(handleNumericInput(e.target.value));
  };

  const handleHalfClick = () => {
    if (!payBalance) return;
    const halfVal = Number(payBalance.formatted) / 2;
    setPayAmount(halfVal.toFixed(6).replace(/\.?0+$/, ''));
  };

  const handleMaxClick = () => {
    if (!payBalance) return;
    setPayAmount(payBalance.formatted);
  };

  // Calculate per-order amount
  const calculatePerOrder = () => {
    if (!payAmount || !totalOrders) return "0.00";
    const perOrder = Number(payAmount) / Number(totalOrders);
    return perOrder.toFixed(6).replace(/\.?0+$/, '');
  };

  // Calculate total duration
  const calculateDuration = () => {
    if (!frequency || !totalOrders) return "-";
    const total = Number(frequency) * Number(totalOrders);
    const unit = Number(totalOrders) > 1 ? `${frequencyUnit}s` : frequencyUnit;
    return `${total} ${unit}`;
  };

  // Balance check
  const isExceeding = useMemo(() => {
    if (!isConnected || !payBalance || !payAmount) return false;
    try {
      const wantRaw = parseUnits(payAmount, payBalance.decimals);
      return wantRaw > payBalance.value;
    } catch {
      return false;
    }
  }, [isConnected, payBalance?.value, payBalance?.decimals, payAmount]);

  // Validation
  const isValidOrder = useMemo(() => {
    return isConnected 
      && payAmount 
      && Number(payAmount) > 0 
      && frequency 
      && Number(frequency) > 0
      && totalOrders 
      && Number(totalOrders) >= 2
      && selectedPayToken
      && selectedReceiveToken
      && !isExceeding;
  }, [isConnected, payAmount, frequency, totalOrders, selectedPayToken, selectedReceiveToken, isExceeding]);

  // Button text
  const getButtonText = () => {
    if (!isConnected) return "Connect Wallet";
    if (!payAmount || Number(payAmount) === 0) return "Enter allocation amount";
    if (isExceeding) return "Amount exceeds balance";
    if (!frequency || Number(frequency) === 0) return "Set frequency";
    if (!totalOrders || Number(totalOrders) < 2) return "Set number of orders (min: 2)";
    if (!selectedPayToken || !selectedReceiveToken) return "Select tokens";
    return "Create recurring order";
  };

  // Token modal helpers
  const openTokenModal = (type: "pay" | "receive") => {
    setTokenSelectionType(type);
    setShowTokenModal(true);
    setSearchTerm("");
  };

  const normalize = (str?: string) => str?.toLowerCase().replace(/\s+/g, "") ?? "";
  const fold = (acc: string, cur: string) => acc + cur;
  const is0x = (str?: string) => /^0x[a-fA-F0-9]{40}$/.test(str ?? "");

  const filteredTokens = useMemo(() => {
    const queryNorm = normalize(searchTerm);
    if (!queryNorm) return combinedTokens;

    const exactMatch: Token[] = [];
    const prefixMatch: Token[] = [];
    const containsMatch: Token[] = [];

    for (const tok of combinedTokens) {
      const symNorm = normalize(tok.symbol);
      const nameNorm = normalize(tok.name);
      const addrNorm = normalize(tok.address);

      if (symNorm === queryNorm || nameNorm === queryNorm || addrNorm === queryNorm) {
        exactMatch.push(tok);
      } else if (symNorm.startsWith(queryNorm) || nameNorm.startsWith(queryNorm)) {
        prefixMatch.push(tok);
      } else if (symNorm.includes(queryNorm) || nameNorm.includes(queryNorm) || addrNorm.includes(queryNorm)) {
        containsMatch.push(tok);
      }
    }

    const localResults = [...exactMatch, ...prefixMatch, ...containsMatch];

    if (!is0x(searchTerm) && searchResults.length > 0) {
      const alreadyIds = new Set(localResults.map(t => normalize(t.address ?? t.symbol)));
      const newRemote = searchResults.filter(sr => !alreadyIds.has(normalize(sr.address ?? sr.symbol)));
      return [...localResults, ...newRemote];
    }

    return localResults;
  }, [combinedTokens, searchTerm, searchResults]);

  const selectToken = (token: Token) => {
    const isCustom = !tokens.some(
      t => normalize(t.symbol) === normalize(token.symbol) && 
           normalize(t.address) === normalize(token.address)
    );

    if (isCustom && token.address) {
      setExtraTokens(prev => {
        const exists = prev.some(
          t => normalize(t.address) === normalize(token.address)
        );
        if (exists) return prev;
        return [...prev, token];
      });
    }

    if (tokenSelectionType === "pay") {
      setPayToken(token.address ?? null);
    } else {
      setReceiveToken(token.address ?? null);
    }
    setShowTokenModal(false);
    setSearchTerm("");
  };

  const handleCreateRecurringOrder = () => {
    if (!isConnected && openConnectModal) {
      openConnectModal();
      return;
    }
    // TODO: Implement recurring order creation
    console.log("Creating recurring order:", {
      payAmount,
      payToken: selectedPayToken,
      receiveToken: selectedReceiveToken,
      frequency,
      frequencyUnit,
      totalOrders,
    });
  };

  return (
    <div className="space-y-3 mt-1">
      {/* I Want To Allocate Section */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs text-white/60 font-medium tracking-wide">I Want To Allocate</span>
          <div className="flex items-center gap-2">
            {isConnected && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleHalfClick}
                  disabled={!payBalance}
                  className="h-6 px-2 text-xs font-medium text-white/50 hover:text-orange-500 hover:bg-transparent transition-colors"
                >
                  HALF
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMaxClick}
                  disabled={!payBalance}
                  className="h-6 px-2 text-xs font-medium text-white/50 hover:text-orange-500 hover:bg-transparent transition-colors"
                >
                  MAX
                </Button>
              </>
            )}
            <div className="flex items-center gap-1.5">
              <Wallet className="h-3 w-3 text-white/40" />
              <TokenBalanceDisplay
                tokenAddress={selectedPayToken?.address as Address | undefined}
                walletAddress={address}
              />
            </div>
          </div>
        </div>

        <Card className="p-3 bg-background/60 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg hover:border-white/20 transition-all">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => openTokenModal("pay")}
              className="h-11 px-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 hover:border-orange-500 transition-all group"
            >
              <TokenAvatar
                symbol={selectedPayToken?.symbol ?? "?"}
                logoURI={selectedPayToken?.logoURI}
                size={24}
              />
              <span className="ml-2 font-semibold text-base text-white group-hover:text-orange-500 transition-colors">
                {selectedPayToken?.symbol ?? "Select"}
              </span>
              <ChevronDown className="ml-1 h-4 w-4 text-white/60 group-hover:text-orange-500 transition-colors" />
            </Button>

            <Input
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={payAmount}
              onChange={handlePayAmountChange}
              className="flex-1 h-11 text-right text-lg font-semibold bg-transparent border-0 focus-visible:ring-0 text-white placeholder:text-white/20"
            />
          </div>
        </Card>
      </div>

      {/* To Buy Section */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-xs text-white/60 font-medium tracking-wide">To Buy</span>
          <div className="flex items-center gap-1.5">
            <Wallet className="h-3 w-3 text-white/40" />
            <TokenBalanceDisplay
              tokenAddress={selectedReceiveToken?.address as Address | undefined}
              walletAddress={address}
            />
          </div>
        </div>

        <Card className="p-3 bg-background/60 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg hover:border-white/20 transition-all">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => openTokenModal("receive")}
              className="h-11 px-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 hover:border-orange-500 transition-all group"
            >
              <TokenAvatar
                symbol={selectedReceiveToken?.symbol ?? "?"}
                logoURI={selectedReceiveToken?.logoURI}
                size={24}
              />
              <span className="ml-2 font-semibold text-base text-white group-hover:text-orange-500 transition-colors">
                {selectedReceiveToken?.symbol ?? "Select"}
              </span>
              <ChevronDown className="ml-1 h-4 w-4 text-white/60 group-hover:text-orange-500 transition-colors" />
            </Button>

            <div className="flex-1 h-11 flex items-center justify-end px-3">
              <span className="text-lg font-semibold text-white/40">
                {selectedReceiveToken?.symbol ?? "—"}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Recurring Settings Card */}
      <Card className="p-4 bg-card/50 backdrop-blur-md border-white/10 rounded-2xl space-y-4">
        {/* Frequency Row */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground min-w-[60px]">Every</span>
          <Input 
            type="text"
            inputMode="decimal"
            value={frequency}
            onChange={handleFrequencyChange}
            placeholder="1"
            className="w-20 text-center bg-background/60 border-white/10 focus-visible:border-primary/60"
          />
          <Select value={frequencyUnit} onValueChange={(val) => setFrequencyUnit(val as typeof frequencyUnit)}>
            <SelectTrigger className="w-[140px] bg-background/60 border-white/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minute">minute</SelectItem>
              <SelectItem value="hour">hour</SelectItem>
              <SelectItem value="day">day</SelectItem>
              <SelectItem value="week">week</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Total Orders Row */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground min-w-[60px]">Over</span>
          <Input 
            type="text"
            inputMode="decimal"
            value={totalOrders}
            onChange={handleOrdersChange}
            placeholder="2"
            className="w-20 text-center bg-background/60 border-white/10 focus-visible:border-primary/60"
          />
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">orders</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Total allocation will be split equally across all orders</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Summary Info */}
        <div className="pt-3 border-t border-white/5 text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>Per order:</span>
            <span className="text-foreground font-medium">
              {calculatePerOrder()} {selectedPayToken?.symbol || "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Duration:</span>
            <span className="text-foreground font-medium">
              {calculateDuration()}
            </span>
          </div>
        </div>
      </Card>

      {/* Create Order Button */}
      <Button
        size="lg"
        className="w-full text-base font-semibold tracking-wide"
        disabled={!isValidOrder && isConnected}
        onClick={handleCreateRecurringOrder}
      >
        {getButtonText()}
      </Button>

      {/* Token Selection Modal */}
      <Dialog open={showTokenModal} onOpenChange={setShowTokenModal}>
        <DialogOverlay className="bg-black/80 backdrop-blur-sm" />
        <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-xl border-white/20">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">
              Select {tokenSelectionType === "pay" ? "Pay" : "Receive"} Token
            </DialogTitle>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, symbol, or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-background/60 border-white/10"
            />
          </div>

          <ScrollArea className="h-[400px] pr-4">
            {searching && searchTerm && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}

            <div className="space-y-1">
              {filteredTokens.map((token, idx) => {
                const isVerified = tokens.some(
                  t => normalize(t.symbol) === normalize(token.symbol)
                );

                return (
                  <button
                    key={`${token.address ?? token.symbol}-${idx}`}
                    onClick={() => selectToken(token)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors group"
                  >
                    <TokenAvatar
                      symbol={token.symbol}
                      logoURI={token.logoURI}
                      size={40}
                    />
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {token.symbol}
                        </span>
                        {isVerified && (
                          <img src={verifiedBadge} alt="verified" className="h-4 w-4" />
                        )}
                      </div>
                      {token.name && (
                        <div className="text-xs text-muted-foreground">
                          {token.name}
                        </div>
                      )}
                      {token.address && (
                        <div className="text-xs text-muted-foreground/60 font-mono">
                          {token.address.slice(0, 6)}...{token.address.slice(-4)}
                        </div>
                      )}
                    </div>
                    {isConnected && (
                      <TokenBalanceDisplay
                        tokenAddress={token.address as Address | undefined}
                        walletAddress={address}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecurringInterface;
