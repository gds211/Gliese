import { useState, useMemo, type Dispatch, type SetStateAction } from "react";
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
import { useTokenSearch } from "@/hooks/useTokenSearch";

import { ChevronDown, Wallet, Search, Loader2 } from "lucide-react";
import TokenAvatar from "@/components/TokenAvatar";
import { useAccount, useBalance } from "wagmi";
import { parseUnits } from "viem";
import glieseLogo from "@/assets/gliese-logo.png";
import verifiedBadge from "@/assets/verified-badge.svg";

interface Token {
  symbol: string;
  name?: string;
  address?: `0x${string}`;
  logoURI?: string;
}

interface TriggerInterfaceProps {
  tokens: Token[];
  payToken: string | null;
  setPayToken: (token: string | null) => void;
  receiveToken: string | null;
  setReceiveToken: (token: string | null) => void;

  // share dynamic tokens with Instant tab
  extraTokens: Array<{ symbol: string; name?: string; address?: `0x${string}`; logoURI?: string }>;
  setExtraTokens: Dispatch<
    SetStateAction<Array<{ symbol: string; name?: string; address?: `0x${string}`; logoURI?: string }>>
  >;
}


const TriggerInterface = ({ 
  tokens,
  payToken,
  setPayToken,
  receiveToken,
  setReceiveToken,
  extraTokens,
  setExtraTokens,
}: TriggerInterfaceProps) => {
  const { address, isConnected } = useAccount();
  
  const [payAmount, setPayAmount] = useState("");
  const [rate, setRate] = useState("");
  const [expiry, setExpiry] = useState("1h");
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenSelectionType, setTokenSelectionType] = useState<"pay" | "receive">("pay");
  const [searchTerm, setSearchTerm] = useState("");
  const [tradeMode, setTradeMode] = useState<"optimized" | "exact">("optimized");
  
  
  const { data: searchResults = [], isLoading: searching } = useTokenSearch(searchTerm);
  const combinedTokens = useMemo(() => [...tokens, ...extraTokens], [tokens, extraTokens]);


  const selectedPayToken = useMemo(() => {
  if (payToken === null) return combinedTokens.find(t => !t.address);
  return combinedTokens.find(t => t.address?.toLowerCase() === payToken.toLowerCase());
}, [combinedTokens, tokens, payToken]);

const selectedReceiveToken = useMemo(() => {
  if (receiveToken === null) return combinedTokens.find(t => !t.address);
  return combinedTokens.find(t => t.address?.toLowerCase() === receiveToken.toLowerCase());
}, [combinedTokens, tokens, receiveToken]);


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

  // Helper to check if token is verified (in our tokens list)
  const isVerifiedToken = (token: { symbol: string; address?: `0x${string}` }) => {
    return tokens.some(t => {
      // Match by address if both have addresses
      if (t.address && token.address) {
        return t.address.toLowerCase() === token.address.toLowerCase();
      }
      // Match by symbol for native tokens (no address)
      if (!t.address && !token.address) {
        return t.symbol.toUpperCase() === token.symbol.toUpperCase();
      }
      return false;
    });
  };

  const isExceeding = useMemo(() => {
    if (!isConnected || !payBalance || !payAmount) return false;
    try {
      const wantRaw = parseUnits(payAmount, payBalance.decimals);
      return wantRaw > payBalance.value;
    } catch {
      return false; // while typing invalid formats
    }
  }, [isConnected, payBalance?.value, payBalance?.decimals, payAmount]);

  // Get dynamic button width based on symbol length
  const getButtonWidth = (symbol?: string) => {
    if (!symbol) return "w-32";
    return symbol.length > 4 ? "w-36" : "w-32";
  };



   type TokenLite = { symbol: string; name?: string; address?: `0x${string}`; logoURI?: string };

const mergedTokens = useMemo<TokenLite[]>(() => {
  const q = searchTerm.trim().toLowerCase();
  if (!q) return combinedTokens;

  // Local subset (symbol/name only)
  const local = combinedTokens.filter((t) =>
    t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)
  );

  // Merge [searchResults + local] with de‑duplication by address/symbol
  const seen = new Set<string>();
  const merged: TokenLite[] = [];
  const push = (tk?: TokenLite) => {
    if (!tk) return;
    const key = tk.address ? tk.address.toLowerCase() : `symbol:${(tk.symbol || "").toUpperCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(tk);
  };

  (searchResults as any[]).forEach(push);
  local.forEach(push);
  return merged;
}, [combinedTokens, searchResults, searchTerm]);

const filteredTokens = mergedTokens;




  

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

  // Validate numeric input (allow only numbers and one decimal point)
  const handleNumericInput = (value: string): string => {
    // Allow empty string
    if (value === "") return "";
    
    // Replace comma with period for decimal separator
    value = value.replace(/,/g, ".");
    
    // Remove all non-numeric characters except decimal point
    let cleaned = value.replace(/[^\d.]/g, "");
    
    // Ensure only one decimal point
    const parts = cleaned.split(".");
    if (parts.length > 2) {
      cleaned = parts[0] + "." + parts.slice(1).join("");
    }
    
    return cleaned;
  };

  const openTokenModal = (type: "pay" | "receive") => {
    setTokenSelectionType(type);
    setShowTokenModal(true);
    setSearchTerm("");
  };

  const selectToken = (token: Token) => {
    // Get the other token for comparison
    const otherToken = tokenSelectionType === "pay" ? selectedReceiveToken : selectedPayToken;
    
    // Check if user selected the same token as the other side (by address)
    const isSameToken = token.address 
      ? token.address.toLowerCase() === otherToken?.address?.toLowerCase()
      : !otherToken?.address && token.symbol === otherToken?.symbol; // native tokens


         // Persist dynamically selected tokens so UI can resolve labels/balances
    if (token.address) {
      const addrL = token.address.toLowerCase();
      const inCurated = tokens.some(t => t.address?.toLowerCase() === addrL);
      const inExtras  = extraTokens.some(t => t.address?.toLowerCase() === addrL);
      if (!inCurated && !inExtras) {
        setExtraTokens(prev => [
          ...prev,
          {
            symbol: token.symbol,
            name: token.name,
            address: token.address as `0x${string}`,
            logoURI: (token as any).logoURI,
          },
        ]);
      }
    }

    
    // If same token selected, swap them instead
    if (isSameToken) {
      handleSwapTokens();
      setShowTokenModal(false);
      return;
    }
    
    // Normal assignment - store address or null for native
    if (tokenSelectionType === "pay") {
      setPayToken(token.address ?? null);
      setPayAmount("");
    } else {
      setReceiveToken(token.address ?? null);
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
              {payBalance ? `${Number(payBalance.formatted).toFixed(4)} ${selectedPayToken?.symbol}` : `0.0000 ${selectedPayToken?.symbol}`}
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
              className={`relative ${getButtonWidth(selectedPayToken?.symbol)} h-10 bg-muted/60 rounded-full text-foreground border border-white/10 hover:border-white hover:bg-muted/80 hover:text-white flex items-center`}
              aria-label="Select pay token"
            >
              {/* Left logo */}
              <span className="absolute left-3 flex items-center gap-2 pointer-events-none">
                <TokenAvatar
                  symbol={selectedPayToken?.symbol}
                  address={selectedPayToken?.address as `0x${string}` | undefined}
                  size={24}
                  title={selectedPayToken?.name || selectedPayToken?.symbol}
                />
              </span>

              {/* Label centered between logo and chevron */}
              <span className="absolute inset-y-0 left-[2.75rem] right-[2.5rem] flex items-center justify-center pointer-events-none truncate">
                {selectedPayToken?.symbol}
              </span>

              {/* Right chevron */}
              <ChevronDown className="absolute right-2 h-3.5 w-3.5 pointer-events-none" />
            </Button>

            <div className="flex-1 text-right">
              <Input
                type="text"
                value={payAmount}
                onChange={(e) => setPayAmount(handleNumericInput(e.target.value))}
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
            <span className="text-[10px] text-muted-foreground">
              OPTIMIZED
            </span>
            <button
              type="button"
              onClick={() => setTradeMode(tradeMode === "optimized" ? "exact" : "optimized")}
              className="relative w-12 h-3 bg-white/20 rounded-full cursor-pointer transition-all duration-200 hover:bg-white/30"
              aria-label={`Toggle trade mode. Currently: ${tradeMode}`}
            >
              <span
                className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 bg-[#1a2332] rounded-full transition-all duration-200 ease-in-out shadow-lg ${
                  tradeMode === "optimized" 
                    ? "left-0 -translate-x-1" 
                    : "right-0 translate-x-1"
                }`}
                style={{
                  border: "2px solid #f97316"
                }}
              />
            </button>
            <span className="text-[10px] text-muted-foreground">
              EXACT
            </span>
          </div>
        </div>

        <Card className="p-3 bg-card/50 border-border">
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={() => openTokenModal("receive")}
              className={`relative ${getButtonWidth(selectedReceiveToken?.symbol)} h-10 bg-muted/60 rounded-full text-foreground border border-white/10 hover:border-white hover:bg-muted/80 hover:text-white flex items-center`}
              aria-label="Select receive token"
            >
              {/* Left logo */}
              <span className="absolute left-3 flex items-center gap-2 pointer-events-none">
                <TokenAvatar
                  symbol={selectedReceiveToken?.symbol}
                  address={selectedReceiveToken?.address as `0x${string}` | undefined}
                  size={24}
                  title={selectedReceiveToken?.name || selectedReceiveToken?.symbol}
                />
              </span>

              {/* Label centered between logo and chevron */}
              <span className="absolute inset-y-0 left-[2.75rem] right-[2.5rem] flex items-center justify-center pointer-events-none truncate">
                {selectedReceiveToken?.symbol}
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
                Buy {selectedReceiveToken?.symbol} at rate
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
                onChange={(e) => setRate(handleNumericInput(e.target.value))}
                placeholder="0.00"
                className="!border-none !bg-transparent w-full !text-base font-medium text-foreground !shadow-none !ring-0 !ring-offset-0 p-0"
              />
            </div>
            <span className="text-sm text-muted-foreground">{selectedReceiveToken?.symbol}</span>
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
        size="lg"
        className="w-full text-base font-semibold tracking-wide"
        disabled={!isConnected || !payAmount || !rate || isExceeding}
      >
        {getButtonText()}
      </Button>

      {/* Token Selection Modal */}
      <Dialog open={showTokenModal} onOpenChange={setShowTokenModal}>
        <DialogOverlay />
        <DialogContent className="sm:max-w-md bg-[#0b0f17]/95 border border-white/10 text-white">
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
              className="pl-10 bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:border-white/40 focus:bg-white/10 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>

          {/* Status */}
          {searchTerm.trim() && (
            <div className="flex items-center gap-2 text-xs text-white/60 py-1">
              {searching ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Searching DEXes…</span>
                </>
              ) : (
                <span>{filteredTokens.length} matches</span>
              )}
            </div>
          )}

          {/* Token List */}

          <ScrollArea className="h-[30.5rem] w-full pr-4">
            <div className="space-y-2">
              {filteredTokens.map((token) => (
                <Button
                  key={token.address ? token.address.toLowerCase() : `symbol:${token.symbol}`}
                  variant="ghost"
                  className="w-full py-3 px-3 rounded-xl border border-white/10 hover:bg-white/5 transition-colors h-auto"
                  onClick={() => selectToken(token)}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <TokenAvatar
                        symbol={token.symbol}
                        address={token.address as `0x${string}` | undefined}
                        size={26}
                        title={token.name || token.symbol}
                        logoURI={(token as any).logoURI}
                      />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-white text-base flex items-center gap-1">
                        {token.symbol}
                        {isVerifiedToken(token) && (
                          <img src={verifiedBadge} alt="verified" className="w-3.5 h-3.5 inline-block" />
                        )}
                      </div>
                      <div className="text-sm text-white/60">{token.name}</div>
                      <div className="text-sm text-white/60 font-mono">
                        {token.address ? formatAddress(token.address) : "Native coin"}
                      </div>
                    </div>
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
