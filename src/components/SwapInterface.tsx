// src/components/SwapInterface.tsx
import { useState, useMemo, useEffect } from "react";
import { Address, parseUnits, formatUnits } from "viem";
import { useAccount, useBalance } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useQueryClient } from "@tanstack/react-query"; // <-- ADDED

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogOverlay } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { usePublicClient } from "wagmi";
import { useNetworkFees } from "@/hooks/useNetworkFees";
import { getDecimals } from "@/lib/decimals";
import { YAK_ROUTER_ABI } from "@/abi/yakRouter";
import { useDynamicSlippageBps } from "@/hooks/useDynamicSlippage";

import { ArrowUpDown, Wallet, Search, ChevronDown } from "lucide-react";
import glieseLogo from "@/assets/gliese-logo.png";

import { PUBLIC_CONFIG } from "@/config/public";
import { useYakQuote } from "@/hooks/useYakQuote";
import { performSwap } from "@/lib/swap";

import TokenAvatar from "@/components/TokenAvatar";
import SlippageIcon from "@/assets/slippage.png";
import TriggerInterface from "@/components/TriggerInterface";




// -------------------- Local helpers --------------------
function formatAmount(raw: bigint, decimals: number, maxFrac: number = 6): string {
  const full = (Number(raw) / 10 ** decimals).toString(); // UI-only
  const [w, f = ""] = full.split(".");
  if (maxFrac <= 0 || f.length === 0) return w;
  const clamped = f.slice(0, maxFrac).replace(/0+$/, "");
  return clamped ? `${w}.${clamped}` : w;
}

function formatAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
}

type TokenPick = { symbol?: string; address?: `0x${string}` };

const tokensEqual = (a?: TokenPick | null, b?: TokenPick | null) => {
  if (!a || !b) return false;
  const aAddr = a.address?.toLowerCase();
  const bAddr = b.address?.toLowerCase();
  if (aAddr && bAddr) return aAddr === bAddr; // same smart-contract address
  const aSym = (a.symbol ?? "").toUpperCase();
  const bSym = (b.symbol ?? "").toUpperCase();
  return aSym !== "" && aSym === bSym;        // fallback for native/no-address
};

// Get dynamic button height based on symbol length
const getButtonHeight = (symbol?: string) => {
  if (!symbol) return "h-10";
  return symbol.length > 4 ? "h-12" : "h-10";
};



// -------------------- Component --------------------
const SwapInterface = () => {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { toast } = useToast();
  const queryClient = useQueryClient(); // <-- ADDED
  const publicClient = usePublicClient();
  const { effectiveGasPriceWei } = useNetworkFees(PUBLIC_CONFIG.FEE_REFRESH_MS);

  // Which tab is active: controls when the bottom swap button shows
  type TabKey = "instant" | "trigger" | "recurring";
  const [activeTab, setActiveTab] = useState<TabKey>("instant");


  // --- Token list (your current list) ---
  const cryptoPrices = {
    MON: 0.00215,
    USDC: 1.0,
    USDT: 1.0,
    CHOG: 16.0,
    DAK: 2650.0,
    aprMON: 0.00214,
  };

  const tokens = [
    { symbol: "MON", name: "monad" }, // native (no address)
    { symbol: "USDC", name: "Circle USD", address: "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea" as `0x${string}` },
    { symbol: "USDT", name: "Tether USD", address: "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D" as `0x${string}` },
    { symbol: "CHOG", name: "chog", address: "0xE0590015A873bF326bd645c3E1266d4db41C4E6B" as `0x${string}` },
    { symbol: "DAK", name: "Molandak", address: "0x0F0BDEbF0F83cD1EE3974779Bcb7315f9808c714" as `0x${string}` },
    { symbol: "aprMON", name: "apriori MON", address: "0xb2f82D0f38dc453D596Ad40A37799446Cc89274A" as `0x${string}` },
  ];

  

  // --- UI State ---
  const [sellAmount, setSellAmount] = useState("");
  const [sellToken, setSellToken] = useState<string | null>(null); // null = native MON
  const [buyToken, setBuyToken] = useState<string | null>("0xf817257fed379853cDe0fa4F97AB987181B1E5Ea"); // USDC address
  const [priceRate, setPriceRate] = useState("1 MON = 0.00215 USDC");

  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenSelectionType, setTokenSelectionType] = useState<"sell" | "buy">("sell");
  const [searchTerm, setSearchTerm] = useState("");
  const [autoSlippage, setAutoSlippage] = useState(
    Boolean((PUBLIC_CONFIG as any).AUTO_SLIPPAGE?.ENABLED_BY_DEFAULT ?? true)
  );

  const selectedSellToken = useMemo(() => {
    if (sellToken === null) return tokens.find(t => !t.address); // find native MON
    return tokens.find(t => t.address?.toLowerCase() === sellToken.toLowerCase());
  }, [tokens, sellToken]);
  
  const selectedBuyToken = useMemo(() => {
    if (buyToken === null) return tokens.find(t => !t.address); // find native MON
    return tokens.find(t => t.address?.toLowerCase() === buyToken.toLowerCase());
  }, [tokens, buyToken]);

  // Treat MON as native when it has no address
  const isNativeSell = useMemo(
    () => !!selectedSellToken && (selectedSellToken.symbol === "MON" || !selectedSellToken.address),
    [selectedSellToken]
  );

  // === Live wallet balance for SELL token ===
  const {
    data: sellBal,
    isLoading: sellBalLoading,
    refetch: refetchSellBalance, // <-- ADDED
  } = useBalance({
    address,
    token: isNativeSell ? undefined : (selectedSellToken?.address as `0x${string}` | undefined),
    query: { enabled: Boolean(isConnected && address && selectedSellToken), refetchOnWindowFocus: false },
  });

  // Balance exceed flag (based on decimals of the current token)
  const isExceeding = useMemo(() => {
    if (!isConnected || !sellBal || !sellAmount) return false;
    try {
      const wantRaw = parseUnits(sellAmount, sellBal.decimals);
      return wantRaw > sellBal.value;
    } catch {
      return false; // while typing invalid formats
    }
  }, [isConnected, sellBal?.value, sellBal?.decimals, sellAmount]);

  // --- Filter for token modal ---
  const filteredTokens = tokens.filter(
    (t) =>
      t.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- Quote from Yak (every 2s, 5% slippage, threshold ≥ 0.1%) ---
  const router = PUBLIC_CONFIG.YAK_ROUTER as Address;
  const tokenInArg = selectedSellToken?.address ?? sellToken; // pass address if exists; otherwise symbol "MON"
  const tokenOutArg = selectedBuyToken?.address ?? buyToken;

  // --- Helper: quote per-unit OUT for an arbitrary human input amount
  const ZERO = "0x0000000000000000000000000000000000000000";
  const isNativeSymbol = (v?: string) =>
    !v || v.toUpperCase() === PUBLIC_CONFIG.NATIVE_SYMBOL || v === ZERO;
  const toQuoteAddr = (v?: string) =>
    (isNativeSymbol(v) ? (PUBLIC_CONFIG.WRAPPED_NATIVE as Address) : (v as Address));

  async function getYakQuotePerUnit(amountHuman: number | string): Promise<{ perUnitOut: number } | null> {
    try {
      const inAddr  = toQuoteAddr(tokenInArg);
      const outAddr = toQuoteAddr(tokenOutArg);
      const inDec   = await getDecimals(publicClient as any, isNativeSymbol(tokenInArg) ? ZERO : inAddr);
      const outDec  = await getDecimals(publicClient as any, isNativeSymbol(tokenOutArg) ? ZERO : outAddr);
      const amtIn   = parseUnits(String(amountHuman), inDec);
      if (amtIn === 0n) return null;
      const gasWei  = effectiveGasPriceWei ?? PUBLIC_CONFIG.GAS_PRICE_WEI_FALLBACK;

      const formatted: any = await (publicClient as any).readContract({
        address: router,
        abi: YAK_ROUTER_ABI,
        functionName: "findBestPathWithGas",
        args: [amtIn, inAddr, outAddr, BigInt(PUBLIC_CONFIG.MAX_STEPS), gasWei],
      });
      const amounts: bigint[] = formatted?.amounts ?? formatted?.[0] ?? [];
      const outRaw = amounts.length ? amounts[amounts.length - 1] : 0n;
      if (outRaw === 0n) return null;
      const outHuman = Number(formatUnits(outRaw, outDec));
      const baseIn   = Number(amountHuman);
      if (!Number.isFinite(outHuman) || !Number.isFinite(baseIn) || baseIn <= 0) return null;
      return { perUnitOut: outHuman / baseIn };
    } catch {
      return null;
    }
  }

  const quote = useYakQuote({
    router,
    tokenIn: tokenInArg,
    tokenOut: tokenOutArg,
    amountInHuman: sellAmount || "0",
    enabled: Boolean(sellAmount && selectedSellToken && selectedBuyToken),
  });

  
  const unitQuote = useYakQuote({
    router,
    tokenIn: tokenInArg,
    tokenOut: tokenOutArg,
    amountInHuman: "1", // 1 whole unit of the SELL token
    enabled: Boolean(
      selectedSellToken &&
      selectedBuyToken &&
      selectedSellToken.symbol !== selectedBuyToken.symbol
    ),
  });

const notionalUsd = useMemo(() => {
  const amt = Number(sellAmount);
  const p = (cryptoPrices as any)[selectedSellToken?.symbol];
  if (!Number.isFinite(amt) || !Number.isFinite(p)) return null;
  return amt * p;
}, [sellAmount, selectedSellToken?.symbol]);

const dynamicSlippage = useDynamicSlippageBps({
  enabled: autoSlippage,
  unitQuote,                                      // volatility source
  userOutFormatted: quote?.outFormatted ?? null,  // size-aware top-up
  userInHuman: sellAmount || null,                // <<< critical for size awareness
  pathLength: quote?.path?.length ?? 1,
  notionalUsd,                                    // MEV cushion calibration
  probePerUnit: async (amountHuman) => {
    const q = await getYakQuotePerUnit(amountHuman);
    return q?.perUnitOut ?? null;
  },
  // reset when the trading context changes (address if available, else symbol)
  resetKey: `${selectedSellToken?.address ?? sellToken}->${selectedBuyToken?.address ?? buyToken}`,
});


// Clamp chosen slippage to global cap (covers both auto/manual)
const capBps = BigInt(
  (PUBLIC_CONFIG as any).AUTO_SLIPPAGE?.MAX_BPS ?? Number(PUBLIC_CONFIG.SLIPPAGE_BPS)
);
const slipRaw = autoSlippage ? (dynamicSlippage.bps ?? 0n) : PUBLIC_CONFIG.SLIPPAGE_BPS;
const SLIP = slipRaw > capBps ? capBps : slipRaw;
// --- UI: formatted slippage for the indicator (one decimal, rounds) ---
const slippageDisplay = useMemo(() => {
  const bps = Number(SLIP ?? 0n);           // bigint -> number (safe; bps is small)
  const pctOneDec = Math.round(bps / 10) / 10;
  return `${pctOneDec.toFixed(1)}%`;
}, [SLIP]);

// Precompute a minOut **raw** using the live (no-slippage) outRaw
const minOutRawDynamic =
  quote?.outRaw != null ? (quote.outRaw * (10_000n - SLIP)) / 10_000n : 0n;


  // Derived buy amount (minOut) using dynamic slippage (size-aware)
const buyAmountDerived = (() => {
  // For display we can scale the formatted out by (1 - SLIP/10000)
  const baseOut = Number(quote?.outFormatted ?? NaN);
  if (!Number.isFinite(baseOut)) return "0.00";
  const s = Number(SLIP) / 10_000;
  const v = baseOut * (1 - s);
  if (!Number.isFinite(v) || v <= 0) return "0.00";
  return v.toString();
})();

  
  // Display version limited to 6 decimals for UI
  const buyAmountDisplay = useMemo(() => {
    const num = Number(buyAmountDerived);
    if (isNaN(num)) return "0.00";
    if (num === 0) return "0.00";
    return num.toFixed(6).replace(/\.?0+$/, '');
  }, [buyAmountDerived]);

  // Rate display: accurate even before typing (uses a 1-unit on-chain quote)
  const rateDisplay = useMemo(() => {
    if (selectedSellToken && selectedBuyToken && selectedSellToken.symbol === selectedBuyToken.symbol) {
      return `1 ${selectedSellToken.symbol} = 1 ${selectedBuyToken.symbol}`;
    }

    const amt = Number(sellAmount);

    // If user typed a positive amount, compute rate from active quote
    if (quote && Number.isFinite(amt) && amt > 0) {
      const r = Number(buyAmountDerived) / amt;
      if (Number.isFinite(r) && r > 0) {
        return `1 ${selectedSellToken?.symbol} = ${r.toFixed(6).replace(/\.?0+$/, "")} ${selectedBuyToken?.symbol}`;
      }
    }

    // Before typing: use the 1-unit *raw* quote, but apply *dynamic* slippage (SLIP)
    if (unitQuote && unitQuote.outFormatted) {
      const uRaw = Number(unitQuote.outFormatted);
      if (Number.isFinite(uRaw) && uRaw > 0) {
        const s = Number(SLIP) / 10_000;
        const u = uRaw * (1 - s);
        return `1 ${selectedSellToken?.symbol} = ${u.toFixed(6).replace(/\.?0+$/, "")} ${selectedBuyToken?.symbol}`;
      }
    }

    // Fallback to your mock when no on-chain path yet
    return priceRate;
  }, [quote, unitQuote, buyAmountDerived, sellAmount, selectedSellToken, selectedBuyToken, priceRate, SLIP]);

  // Keep your existing mock updater as a fallback when no quote yet
  useEffect(() => {
    const updatePriceRate = () => {
      const sellPrice = (cryptoPrices as any)[selectedSellToken?.symbol] || 0;
      const buyPrice = (cryptoPrices as any)[selectedBuyToken?.symbol] || 0;
      if (sellPrice > 0 && buyPrice > 0) {
        const exchangeRate = sellPrice / buyPrice;
        const variation = (Math.random() - 0.5) * (exchangeRate * 0.001);
        const newRate = (exchangeRate + variation).toFixed(5);
        setPriceRate(`1 ${selectedSellToken?.symbol} = ${newRate} ${selectedBuyToken?.symbol}`);
      }
    };
    updatePriceRate();
    const interval = setInterval(updatePriceRate, 20000);
    return () => clearInterval(interval);
  }, [selectedSellToken?.symbol, selectedBuyToken?.symbol]);

  // Reset input values when switching tabs
  useEffect(() => {
    setSellAmount("");
    setSearchTerm("");
    setShowTokenModal(false);
  }, [activeTab]);

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

  // USD helpers (for your current UI)
  const calculateUSDValue = (amount: string, token: string): string => {
    const numAmount = parseFloat(amount) || 0;
    const price = (cryptoPrices as any)[token] || 0;
    const usdValue = numAmount * price;
    return usdValue < 0.01 && usdValue > 0 ? `$${usdValue.toFixed(6)}` : `$${usdValue.toFixed(2)}`;
  };

  // ------------ ADDED: precise, safe post-swap refresh ------------
  const refreshBalances = async () => {
    // 1) Hard refresh the currently displayed SELL token balance (wallet icon near input)
    await Promise.allSettled([refetchSellBalance()]);

    // 2) Broadly invalidate any "balance" queries for this wallet
    //    (covers your top-right wallet icon or other components using useBalance)
    const ownerLc = (address ?? "").toLowerCase();
    queryClient.invalidateQueries({
      predicate: (q) => {
        try {
          const s = JSON.stringify(q.queryKey ?? "").toLowerCase();
          const hasBalance = s.includes("balance");
          const matchesOwner = ownerLc ? s.includes(ownerLc) : true;
          return hasBalance && matchesOwner;
        } catch {
          return false;
        }
      },
    });
  };
  // ---------------------------------------------------------------

  // Handlers
  const handleSwapTokens = () => {
    const t = sellToken;
    setSellToken(buyToken);
    setBuyToken(t);
    const hasValue = sellAmount && sellAmount !== "0" && sellAmount !== "0.0" && sellAmount !== "0.00";
    setSellAmount(hasValue ? (() => {
      const num = Number(buyAmountDerived);
      if (isNaN(num) || num === 0) return "0";
      // Limit to 6 decimals and remove trailing zeros
      return num.toFixed(6).replace(/\.?0+$/, '');
    })() : "");
  };

  const openTokenModal = (type: "sell" | "buy") => {
    setTokenSelectionType(type);
    setShowTokenModal(true);
    setSearchTerm("");
  };

 // Keep TokenPick/tokensEqual as you already have above.

type TokenObj = { symbol: string; address?: `0x${string}`; name?: string; decimals?: number };

const selectToken = (picked: string | TokenObj) => {
  // Normalize to a full token object regardless of how it's called
  const tokenObj: TokenObj | undefined =
    typeof picked === "string" ? tokens.find((t) => t.symbol === picked) : picked;

  // If not found (bad symbol or empty search), just close the modal safely
  if (!tokenObj) {
    setShowTokenModal(false);
    return;
  }

  const other = tokenSelectionType === "sell" ? selectedBuyToken : selectedSellToken;

  // If user picked the same token as the other side, reuse your existing arrow handler
  if (tokensEqual(tokenObj, other)) {
    handleSwapTokens();       // <-- your arrow button handler
    setShowTokenModal(false);
    return;
  }

  // Normal assignment - store address or null for native
  if (tokenSelectionType === "sell") {
    setSellToken(tokenObj.address ?? null);
    setSellAmount("");        // keep your reset
  } else {
    setBuyToken(tokenObj.address ?? null);
  }

  setShowTokenModal(false);
};




  // === SWAP click ===
  const onClickSwap = async () => {
    try {
      if (!isConnected) {
        openConnectModal?.();
        return;
      }
      if (!sellAmount || Number(sellAmount) <= 0) throw new Error("Enter an amount.");
      if (!quote || quote.minOutRaw === 0n || !quote.path?.length) throw new Error("No route found.");
      if (!selectedSellToken || !selectedBuyToken) throw new Error("Select tokens.");

      const inDec = sellBal?.decimals ?? 18;
      const amountIn = parseUnits(sellAmount, inDec);

      toast({ title: "Preparing swap...", description: "Checking allowance & building txn" });

      const receipt = await performSwap({
        router,
        tokenIn: selectedSellToken.address ?? selectedSellToken.symbol, // "MON" is fine here for native detection
        tokenOut: selectedBuyToken.address ?? selectedBuyToken.symbol,
        amountIn,
        amountOutMin: minOutRawDynamic, // dynamic, size-aware (hard-capped) slippage
        path: quote.path,
        adapters: quote.adapters,
      });

      toast({
        title: "Swap confirmed ✅",
        description: `Tx: ${receipt.transactionHash.slice(0, 10)}…`,
      });

      // Instant balance refresh
      const status = (receipt as any)?.status;
      if (status === "success" || status === 1 || status === "0x1") {
        await refreshBalances();
      }
    } catch (err: any) {
      const msg = err?.shortMessage || err?.message || String(err);
      toast({ title: "Swap failed", description: msg });
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-muted/40 backdrop-blur-md border border-muted/60 shadow-2xl">
      <div className="p-4 space-y-4">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-muted/40 h-10">
            <TabsTrigger value="instant" className="text-sm flex items-center gap-2 h-8 data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground">
              <span>⚡</span> Instant
            </TabsTrigger>
            <TabsTrigger value="trigger" className="text-sm flex items-center gap-2 h-8 data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground">
              <span>🔫</span> Trigger
            </TabsTrigger>
            <TabsTrigger value="recurring" className="text-sm flex items-center gap-2 h-8 data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground">
              <span>🔄</span> Recurring
            </TabsTrigger>
          </TabsList>

          <TabsContent value="instant" className="mt-4 space-y-3">
            {/* Selling Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm text-muted-foreground">Selling</label>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Wallet className="h-3 w-3" />
                    {sellBalLoading ? "…" : sellBal ? `${Number(sellBal.formatted).toFixed(4)} ${selectedSellToken?.symbol}` : `0.00 ${selectedSellToken?.symbol}`}
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
                      // keep small MON buffer for gas when selling native
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
                      className={`relative w-32 ${getButtonHeight(selectedSellToken?.symbol)} bg-muted/60 rounded-full text-foreground border border-white/10 hover:border-white hover:bg-muted/80 hover:text-white flex items-center`}
                      aria-label="Select sell token"
                  >
                      {/* Left logo (shifted slightly right) */}
                  <span className="absolute left-3 flex items-center gap-2 pointer-events-none">
                    <TokenAvatar
                      symbol={selectedSellToken?.symbol}
                      address={selectedSellToken?.address as `0x${string}` | undefined}
                      size={24}
                      title={selectedSellToken?.name || selectedSellToken?.symbol}
                    />
                  </span>

                  {/* Label zone spans between the logo and the chevron; text biased toward the chevron */}
                   {/* Label centered in the space between logo and chevron */}
                  <span
                    className="absolute inset-y-0 left-[2.75rem] right-[2.5rem] flex items-center justify-center pointer-events-none truncate"
                  >
                    {selectedSellToken?.symbol}
                  </span>


                  

                    {/* Right chevron */}
                   <ChevronDown className="absolute right-2 h-3.5 w-3.5 pointer-events-none" />
                  </Button>
                  <Input
                    value={sellAmount}
                    onChange={(e) => setSellAmount(handleNumericInput(e.target.value))}
                    className="!border-none !bg-transparent text-right flex-1 !text-24 font-medium tracking-tight pr-2 h-auto text-foreground !shadow-none !ring-0 !ring-offset-0"
                    style={{ color: isExceeding ? "#ef4444" : undefined }}
                    placeholder="0.00"
                  />
                </div>
                <div className="text-right text-sm text-muted-foreground pr-3 pb-3">
                  {(() => {
                    const num = sellAmount || "0";
                    return calculateUSDValue(num, selectedSellToken?.symbol || "");
                  })()}
                </div>
              </div>
            </div>

            {/* Swap Arrow */}
            <div className="flex justify-center -my-2 relative z-10">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSwapTokens}
                className="h-8 w-8 p-0 bg-background/60 hover:bg-white rounded-md border border-border/40 hover:border-blue-600 transition-colors duration-200"
              >
                <ArrowUpDown className="h-4 w-4 text-blue-600" />
              </Button>
            </div>

            {/* Buying Section */}
            <div className="space-y-3">
              <div className="relative bg-background/60 rounded-2xl border border-white/10 focus-within:border-primary/60 transition-colors duration-200">
                <span className="absolute left-0 bottom-full mb-3 text-sm text-muted-foreground pointer-events-none select-none">
                  Buying
                </span>
                <div className="absolute right-0 bottom-full mb-3 flex items-center gap-1.5 text-sm text-muted-foreground select-none">
                     <img src={SlippageIcon} alt="Slippage" className="w-3.5 h-3.5 shrink-0" />
                     <span className="leading-none tabular-nums">{slippageDisplay}</span>
                </div>
                <div className="flex items-center justify-between p-3">
                  <Button
                    variant="ghost"
                    onClick={() => openTokenModal("buy")}
                    className={`relative w-32 ${getButtonHeight(selectedBuyToken?.symbol)} bg-muted/60 rounded-full text-foreground border border-white/10 hover:border-white hover:bg-muted/80 hover:text-white flex items-center`}
                    aria-label="Select buy token"
                >
                {/* Left logo (same as SELL) */}
                <span className="absolute left-3 flex items-center gap-2 pointer-events-none">
                  <TokenAvatar
                    symbol={selectedBuyToken?.symbol}
                    address={selectedBuyToken?.address as `0x${string}` | undefined}
                    size={24}
                    title={selectedBuyToken?.name || selectedBuyToken?.symbol}
                  />
                </span>

                {/* Label centered exactly between logo and chevron (same as SELL) */}
                <span
                  className="absolute inset-y-0 left-[2.75rem] right-[2.5rem] flex items-center justify-center pointer-events-none truncate"
                >
                 {selectedBuyToken?.symbol}
                </span>

                {/* Right chevron (same as SELL) */}
                     <ChevronDown className="absolute right-2 h-3.5 w-3.5 pointer-events-none" />
                  </Button>

                  <Input
                    value={buyAmountDisplay}
                    readOnly
                    className="!border-none !bg-transparent text-right flex-1 !text-24 font-medium tracking-tight pr-2 h-auto text-foreground !shadow-none !ring-0 !ring-offset-0"
                    placeholder="0.00"
                  />
                </div>
                <div className="text-right text-sm text-muted-foreground pr-3 pb-3">
                  {calculateUSDValue(buyAmountDerived, selectedBuyToken?.symbol || "")}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div>Rate: {rateDisplay}</div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 border-2 border-border px-2 py-1 rounded-lg">
                    <img src={glieseLogo} alt="Gliese" className="w-4 h-4 rounded-lg" />
                    <span>Wrapdrive v1.1</span>
                  </div>
                  <span>0.02% FEE</span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="trigger" className="mt-4">
            <TriggerInterface 
              tokens={tokens}
              payToken={sellToken}
              setPayToken={setSellToken}
              receiveToken={buyToken}
              setReceiveToken={setBuyToken}
            />
          </TabsContent>

          <TabsContent value="recurring">
            <div className="text-center text-muted-foreground py-8">Recurring orders coming soon</div>
          </TabsContent>
        </Tabs>

        {/* Connect/Swap Button */}
      {activeTab === "instant" && (
        <div className="w-full mt-4">
          <Button
            size="lg"
            className="w-full text-base font-semibold tracking-wide"
            disabled={
              (!isConnected && !openConnectModal) ||
              !sellAmount ||
              sellAmount === "0" ||
              sellAmount === "0.0" ||
              isExceeding ||
              !quote ||
              quote.minOutRaw === 0n
            }
            onClick={() => {
              if (!isConnected) return openConnectModal?.();
              onClickSwap();
            }}
          >
            {!isConnected
              ? "Connect Wallet"
              : isExceeding
              ? "Amount exceeds balance"
              : !sellAmount || sellAmount === "0" || sellAmount === "0.0"
              ? "Enter an amount"
              : !quote || quote.minOutRaw === 0n
              ? "No route"
              : "Swap"}
          </Button>
        </div>
        )}
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
    </Card>
  );
};

export default SwapInterface;


