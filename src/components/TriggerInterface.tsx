import { useState, useMemo, type Dispatch, type SetStateAction } from "react";
import { Address } from "viem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useTokenBalance } from "@/hooks/useTokenBalance";
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
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useQueryClient } from "@tanstack/react-query";
import { getBalanceQueryKey } from "wagmi/query";
import { useMultiTokenBalances } from "@/hooks/useMultiTokenBalances";

import { ChevronDown, Wallet, Search, Loader2 } from "lucide-react";
import TokenAvatar from "@/components/TokenAvatar";
import { useAccount, useBalance } from "wagmi";
import { parseUnits } from "viem";
import glieseLogo from "@/assets/gliese-logo.png";
import verifiedBadge from "@/assets/verified-badge.svg";
import { formatBalanceWithScale } from "@/lib/utils";
import { PUBLIC_CONFIG } from "@/config/public";

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

  if (!walletAddress) return <span className="text-xs text-white font-medium tabular-nums">0.0000</span>;
  if (isLoading) return <span className="text-xs text-white font-medium tabular-nums">...</span>;
  
  return (
    <span className="text-xs text-white font-medium tabular-nums">
      {formatted ? formatBalanceWithScale(parseFloat(formatted)) : "0.0000"}
    </span>
  );
};

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
  const { openConnectModal } = useConnectModal();
  const queryClient = useQueryClient();
  
  const [payAmount, setPayAmount] = useState("");
  const [rate, setRate] = useState("");
  const [expiry, setExpiry] = useState("1h");
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenSelectionType, setTokenSelectionType] = useState<"pay" | "receive">("pay");
  const [searchTerm, setSearchTerm] = useState("");
  const [tradeMode, setTradeMode] = useState<"optimized" | "exact">("optimized");
  
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 250);
  const { data: searchResults = [], isLoading: searching } = useTokenSearch(debouncedSearchTerm);

  const combinedTokens = useMemo(() => [...tokens, ...extraTokens], [tokens, extraTokens]);

  // Pre-fetch balances for all tokens when wallet is connected
  const { isLoading: balancesLoading } = useMultiTokenBalances(combinedTokens);

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
  // Removed getButtonWidth - buttons now use w-auto min-w-[8rem] for dynamic sizing

  // --- search normalization helpers ---
const normalize = (s?: string) =>
  (s ?? "")
    .normalize("NFKD")
    // strip diacritics
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

const fold = (s?: string) =>
  normalize(s).replace(/[^a-z0-9]/g, ""); // collapse separators

const is0x = (s?: string) => !!s && /^0x[0-9a-f]{4,}$/i.test(s);




 // --- Search + Filter for token modal (DEX + address + local) ---
type TokenLite = {
  symbol: string;
  name?: string;
  address?: `0x${string}`;
  logoURI?: string;
};


const filteredTokens: TokenLite[] = useMemo(() => {
  const raw = (searchTerm ?? "").trim();
  const q = normalize(raw);
  const fq = fold(raw);

  // When empty → show curated defaults, sorted by balance if wallet connected
  if (!q) {
    const filtered = tokens.filter((t) => isVerifiedToken(t));
    
    // Sort by balance when wallet is connected
    if (isConnected && address) {
      const tokensWithBalance: TokenLite[] = [];
      const tokensWithoutBalance: TokenLite[] = [];
      
      for (const token of filtered) {
        const balanceQueryKey = getBalanceQueryKey({
          address,
          token: token.address as Address,
          chainId: PUBLIC_CONFIG.CHAIN_ID,
        });
        const cachedBalance = queryClient.getQueryData(balanceQueryKey) as any;
        
        const hasBalance = cachedBalance?.value && cachedBalance.value > 0n;
        
        if (hasBalance) {
          tokensWithBalance.push(token);
        } else {
          tokensWithoutBalance.push(token);
        }
      }
      
      // Sort tokens with balance by balance amount (highest first)
      tokensWithBalance.sort((a, b) => {
        const balanceA = queryClient.getQueryData(
          getBalanceQueryKey({
            address,
            token: a.address as Address,
            chainId: PUBLIC_CONFIG.CHAIN_ID,
          })
        ) as any;
        
        const balanceB = queryClient.getQueryData(
          getBalanceQueryKey({
            address,
            token: b.address as Address,
            chainId: PUBLIC_CONFIG.CHAIN_ID,
          })
        ) as any;
        
        const valueA = balanceA?.value ?? 0n;
        const valueB = balanceB?.value ?? 0n;
        
        // Descending order (highest balance first)
        if (valueB > valueA) return 1;
        if (valueB < valueA) return -1;
        return 0;
      });
      
      return [...tokensWithBalance, ...tokensWithoutBalance];
    }
    
    return filtered;
  }

  const isAddressQuery = is0x(raw);
  const isShortQuery = !isAddressQuery && fq.length < 2; // keep in sync with useTokenSearch

  // Precompute curated membership for the priority boost
  const curatedAddr = new Set(
    tokens.map(t => t.address?.toLowerCase()).filter(Boolean) as string[]
  );
  const curatedSym = new Set(
    tokens.filter(t => !t.address).map(t => (t.symbol || "").toUpperCase())
  );

  // Collect candidates from: curated (tokens), extraTokens (user‑added), and remote searchResults
  const candidates: Array<TokenLite & { __source: "curated" | "extra" | "remote" }> = [];

  const shouldKeep = (t: TokenLite) => {
    const symF = fold(t.symbol);
    const nameF = fold(t.name);
    const addr = t.address?.toLowerCase() || "";

    // Address search only when input looks like 0x…
    const addrHit = isAddressQuery && addr.includes(raw.toLowerCase());

    return (
      (!!fq && (symF.includes(fq) || nameF.includes(fq))) ||
      addrHit
    );
  };

  // 1) curated first (still scored—but they get a large boost)
  for (const t of tokens) {
    const tk: TokenLite = {
      symbol: t.symbol,
      name: t.name,
      address: t.address,
      logoURI: (t as any).logoURI,
    };
    if (shouldKeep(tk)) candidates.push({ ...tk, __source: "curated" });
  }

  // 2) extra tokens (user‑added)
  for (const t of extraTokens) {
    const tk: TokenLite = {
      symbol: t.symbol,
      name: t.name,
      address: t.address,
      logoURI: t.logoURI,
    };
    if (shouldKeep(tk)) candidates.push({ ...tk, __source: "extra" });
  }

  // 3) remote results from the hook — only for "long enough" queries or address‑like queries
  if (!isShortQuery) {
    for (const t of (searchResults as any[])) {
      const tk: TokenLite = {
        symbol: t.symbol || "",
        name: t.name,
        address: t.address as any,
        logoURI: t.logoURI,
      };
      if (shouldKeep(tk)) candidates.push({ ...tk, __source: "remote" });
    }
  }

  // De‑duplicate: first by address (ERC‑20), then by native symbol
  const seen = new Set<string>();
  const deduped: TokenLite[] = [];
  for (const t of candidates) {
    const key = t.address
      ? `addr:${t.address.toLowerCase()}`
      : `sym:${(t.symbol || "").toUpperCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push({
      symbol: t.symbol,
      name: t.name,
      address: t.address,
      logoURI: t.logoURI,
    });
  }

  const scoreOf = (t: TokenLite): number => {
    const sym = t.symbol || "";
    const nm = t.name || "";
    const addr = (t.address || "").toLowerCase();

    const symU = sym.toUpperCase();
    const symF = fold(sym);
    const nameF = fold(nm);

    let s = 0;

    // 1) address typed → exact match on top
    if (isAddressQuery) {
      if (addr === raw.toLowerCase()) s += 10000;
      if (addr && addr.includes(raw.toLowerCase())) s += 9000;
    }

    // 2) exact symbol / exact name
    if (symU === raw.toUpperCase()) s += 8000;
    if (normalize(nm) === q) s += 7600;

    // 3) startsWith (symbol first, then name)
    if (symF.startsWith(fq)) s += 6000;
    if (nameF.startsWith(fq)) s += 5200;

    // 4) substring (symbol first, then name)
    if (symF.includes(fq)) s += 4000;
    if (nameF.includes(fq)) s += 3500;

    // 5) curated boost (local tokens[] are preferred)
    const isCurated = t.address
      ? curatedAddr.has(addr)
      : curatedSym.has(symU);
    if (isCurated) s += 100000;

    // 6) prefer native over "wrapped" when query matches base symbol
    if (/^w/i.test(sym) && symF.replace(/^w/i, "") === fq) s -= 500;

    // 7) tiny bias toward shorter symbols for tie‑breaks
    s += Math.max(0, 200 - sym.length);

    return s;
  };

  deduped.sort((a, b) => {
    const d = scoreOf(b) - scoreOf(a);
    if (d !== 0) return d;
    const aKey = (a.symbol || "") + "|" + (a.address || "");
    const bKey = (b.symbol || "") + "|" + (b.address || "");
    return aKey.localeCompare(bKey);
  });

  return deduped;
}, [searchTerm, tokens, extraTokens, searchResults, isConnected, address, queryClient, selectedPayToken, selectedReceiveToken, balancesLoading]);




  

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
              {payBalance && Number(payBalance.formatted) > 0 ? (() => {
                const num = Number(payBalance.formatted);
                
                // Dynamic decimals: 4 for <100, then decrease by 1
                let decimals;
                if (num < 100) decimals = 4;
                else if (num < 1000) decimals = 3;
                else if (num < 10000) decimals = 2;
                else if (num < 100000) decimals = 1;
                else decimals = 0;
                
                const formatted = num.toFixed(decimals).replace(/\.?0+$/, '');
                return `${formatted} ${selectedPayToken?.symbol}`;
              })() : `0.00 ${selectedPayToken?.symbol}`}
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
              className="relative w-auto min-w-[8rem] pl-11 pr-10 h-10 bg-muted/60 rounded-full text-foreground border border-white/10 hover:border-white hover:bg-muted/80 hover:text-white flex items-center"
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
              <span className="text-sm font-medium whitespace-nowrap">
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
            <button
              type="button"
              onClick={() => setTradeMode("optimized")}
              className={`text-[10px] transition-colors duration-200 ${
                tradeMode === "optimized" 
                  ? "text-white/80 font-medium" 
                  : "text-white/40"
              }`}
            >
              OPTIMIZED
            </button>
            
            <div 
              onClick={() => {
                setTradeMode(tradeMode === "optimized" ? "exact" : "optimized");
              }}
              className="cursor-pointer"
            >
              <Slider
                min={0}
                max={1}
                step={1}
                value={[tradeMode === "optimized" ? 0 : 1]}
                onValueChange={(value) => {
                  setTradeMode(value[0] === 0 ? "optimized" : "exact");
                }}
                className="w-12 pointer-events-none"
                aria-label="Toggle trade mode"
              />
            </div>
            
            <button
              type="button"
              onClick={() => setTradeMode("exact")}
              className={`text-[10px] transition-colors duration-200 ${
                tradeMode === "exact" 
                  ? "text-white/80 font-medium" 
                  : "text-white/40"
              }`}
            >
              EXACT
            </button>
          </div>
        </div>

        <Card className="p-3 bg-card/50 border-border">
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={() => openTokenModal("receive")}
              className="relative w-auto min-w-[8rem] pl-11 pr-10 h-10 bg-muted/60 rounded-full text-foreground border border-white/10 hover:border-white hover:bg-muted/80 hover:text-white flex items-center"
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
              <span className="text-sm font-medium whitespace-nowrap">
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
        disabled={isConnected && (!payAmount || !rate || isExceeding)}
        onClick={() => {
          if (!isConnected) return openConnectModal?.();
          // TODO: Add trigger order creation logic here
        }}
      >
        {getButtonText()}
      </Button>

      {/* Token Selection Modal */}
      <Dialog open={showTokenModal} onOpenChange={setShowTokenModal}>
        <DialogOverlay />
        <DialogContent className="sm:max-w-md bg-[#0b0f17]/95 border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              Select a token to {tokenSelectionType === "pay" ? "sell" : "buy"}
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
            {searchTerm.trim() && searching && (
              <div className="flex items-center gap-2 text-xs text-white/60 py-1">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Searching DEXes…</span>
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
                        size={30}
                        title={token.name || token.symbol}
                        logoURI={(token as any).logoURI}
                      />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-white text-base flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          {token.symbol}
                          {isVerifiedToken(token) && (
                            <img src={verifiedBadge} alt="verified" className="w-3.5 h-3.5 inline-block" />
                          )}
                        </div>
                        <TokenBalanceDisplay 
                          tokenAddress={token.address as Address | undefined}
                          walletAddress={address}
                        />
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
