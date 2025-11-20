// src/components/SwapInterface.tsx
import { useState, useMemo, useEffect } from "react";
import { Address, parseUnits, formatUnits } from "viem";
import { useAccount, useBalance } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useQueryClient } from "@tanstack/react-query"; // <-- ADDED
import { useTokenBalance } from "@/hooks/useTokenBalance";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogOverlay } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast, useToast } from "@/hooks/use-toast";
import { usePublicClient } from "wagmi";
import { useNetworkFees } from "@/hooks/useNetworkFees";
import { getDecimals } from "@/lib/decimals";
import { YAK_ROUTER_ABI } from "@/abi/yakRouter";
import { useDynamicSlippageBps } from "@/hooks/useDynamicSlippage";

import { ArrowUpDown, Wallet, Search, ChevronDown, Loader2 } from "lucide-react";
import glieseLogo from "@/assets/gliese-logo.png";
import verifiedBadge from "@/assets/verified-badge.svg";
import externalLinkIcon from "@/assets/external-link.png";
import checkmarkIcon from "@/assets/checkmark-icon.png";

import { PUBLIC_CONFIG } from "@/config/public";
import { useYakQuote } from "@/hooks/useYakQuote";
import { performSwap } from "@/lib/swap";

import TokenAvatar from "@/components/TokenAvatar";
import { useTokenSearch } from "@/hooks/useTokenSearch";
import SlippageIcon from "@/assets/slippage.png";
import TriggerInterface from "@/components/TriggerInterface";
import { swapAudioPlayer } from "@/lib/audioPlayer";


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




// Get dynamic button width based on symbol length
const getButtonWidth = (symbol?: string) => {
  if (!symbol) return "w-32";
  return symbol.length > 4 ? "w-36" : "w-32";
};



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

  if (!walletAddress) return <span className="text-xs text-white font-medium tabular-nums">0.00</span>;
  if (isLoading) return <span className="text-xs text-white font-medium tabular-nums">...</span>;
  
  return (
    <span className="text-xs text-white font-medium tabular-nums">
      {formatted ? parseFloat(formatted).toFixed(2) : "0.00"}
    </span>
  );
};

// -------------------- Component Props --------------------
type TabKey = "instant" | "trigger" | "recurring";

type SwapInterfaceProps = {
  activeTab?: TabKey;
  onTabChange?: (tab: TabKey) => void;
};

// -------------------- Component --------------------
const SwapInterface = ({ 
  activeTab: externalActiveTab, 
  onTabChange 
}: SwapInterfaceProps = {}) => {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { toast } = useToast();
  const queryClient = useQueryClient(); // <-- ADDED
  const publicClient = usePublicClient();
  const { effectiveGasPriceWei } = useNetworkFees(PUBLIC_CONFIG.FEE_REFRESH_MS);

  // Which tab is active: controls when the bottom swap button shows
  const [internalActiveTab, setInternalActiveTab] = useState<TabKey>("instant");
  const activeTab = externalActiveTab || internalActiveTab;
  
  const handleTabChange = (v: TabKey) => {
    if (onTabChange) {
      onTabChange(v);
    } else {
      setInternalActiveTab(v);
    }
  };


  // --- Token list (your current list) ---
  
  const tokens = [
    { symbol: "MON", name: "monad" }, // native (no address)
    { symbol: "USDC", name: "Circle USD", address: "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea" as `0x${string}` },
    { symbol: "USDT", name: "Tether USD", address: "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D" as `0x${string}` },
    { symbol: "CHOG", name: "chog", address: "0xE0590015A873bF326bd645c3E1266d4db41C4E6B" as `0x${string}` },
    { symbol: "DAK", name: "Molandak", address: "0x0F0BDEbF0F83cD1EE3974779Bcb7315f9808c714" as `0x${string}` },
    { symbol: "aprMON", name: "apriori MON", address: "0xb2f82D0f38dc453D596Ad40A37799446Cc89274A" as `0x${string}` },
    { symbol: "WMON", name: "Wrapped Monad", address: "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701" as `0x${string}` },
    { symbol: "gMON", name: "gMON", address: "0xaEef2f6B429Cb59C9B2D7bB2141ADa993E8571c3" as `0x${string}` },
    { symbol: "shMON", name: "ShMonad", address: "0x3a98250F98Dd388C211206983453837C8365BDc1" as `0x${string}` },
    { symbol: "YAKI", name: "Moyaki", address: "0xfe140e1dCe99Be9F4F15d657CD9b7BF622270C50" as `0x${string}` },
    { symbol: "WETH", name: "Wrapped ETH", address: "0xB5a30b0FDc5EA94A52fDc42e3E9760Cb8449Fb37" as `0x${string}` },
    { symbol: "WBTC", name: "Wrapped BTC", address: "0xcf5a6076cfa32686c0Df13aBaDa2b40dec133F1d" as `0x${string}` },
  ];

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

  

  // --- UI State ---
  const [sellAmount, setSellAmount] = useState("");
  const [sellToken, setSellToken] = useState<string | null>(null); // null = native MON
  const [buyToken, setBuyToken] = useState<string | null>("0xf817257fed379853cDe0fa4F97AB987181B1E5Ea"); // USDC address
  

  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenSelectionType, setTokenSelectionType] = useState<"sell" | "buy">("sell");
  const [searchTerm, setSearchTerm] = useState("");
  const [extraTokens, setExtraTokens] = useState<
  Array<{ symbol: string; name?: string; address?: `0x${string}`; logoURI?: string }>
  >([]);

  const { data: searchResults = [], isLoading: searching } = useTokenSearch(searchTerm);
  const [autoSlippage, setAutoSlippage] = useState(
    Boolean((PUBLIC_CONFIG as any).AUTO_SLIPPAGE?.ENABLED_BY_DEFAULT ?? true)
  );

 const combinedTokens = useMemo(() => [...tokens, ...extraTokens], [tokens, extraTokens]);
 const selectedSellToken = useMemo(() => {
   if (sellToken === null) return combinedTokens.find(t => !t.address) || tokens.find(t => !t.address);
   return combinedTokens.find(t => t.address?.toLowerCase() === sellToken?.toLowerCase());
 }, [combinedTokens, tokens, sellToken]);

 const selectedBuyToken = useMemo(() => {
   if (buyToken === null) return combinedTokens.find(t => !t.address) || tokens.find(t => !t.address);
   return combinedTokens.find(t => t.address?.toLowerCase() === buyToken?.toLowerCase());
 }, [combinedTokens, tokens, buyToken]);
  
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

  // Show curated defaults when empty
  if (!q) return tokens;

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
    // address search only when input looks like 0x…
    const addrHit = is0x(raw) && addr.includes(raw.toLowerCase());
    return (
      symF.includes(fq) ||
      nameF.includes(fq) ||
      addrHit
    );
  };

  // 1) curated first (we will still score/sort, but they get a large boost)
  for (const t of tokens) {
    const tk: TokenLite = { symbol: t.symbol, name: t.name, address: t.address, logoURI: (t as any).logoURI };
    if (shouldKeep(tk)) candidates.push({ ...tk, __source: "curated" });
  }

  // 2) extra tokens (user-added)
  for (const t of extraTokens) {
    const tk: TokenLite = { symbol: t.symbol, name: t.name, address: t.address, logoURI: t.logoURI };
    if (shouldKeep(tk)) candidates.push({ ...tk, __source: "extra" });
  }

  // 3) remote results from the hook
  for (const t of (searchResults as any[])) {
    const tk: TokenLite = { symbol: t.symbol || "", name: t.name, address: t.address as any, logoURI: t.logoURI };
    if (shouldKeep(tk)) candidates.push({ ...tk, __source: "remote" });
  }

  // De‑duplicate: first by address (ERC‑20), then by native symbol
  const seen = new Set<string>();
  const deduped: TokenLite[] = [];
  for (const t of candidates) {
    const key = t.address ? `addr:${t.address.toLowerCase()}` : `sym:${(t.symbol || "").toUpperCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push({ symbol: t.symbol, name: t.name, address: t.address, logoURI: t.logoURI });
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
    if (is0x(raw)) {
      if (addr === raw.toLowerCase()) s += 10000;
      if (addr.includes(raw.toLowerCase())) s += 9000;
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
    // Stable, deterministic secondary order
    const aKey = (a.symbol || "") + "|" + (a.address || "");
    const bKey = (b.symbol || "") + "|" + (b.address || "");
    return aKey.localeCompare(bKey);
  });

  return deduped;
}, [searchTerm, tokens, extraTokens, searchResults]);

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



   // === USD valuation via on-chain Yak → Stable (minimal RPC) ===
  // Pick a preferred USD stable (USDC if present; else USDT).
  const stableUSDC = tokens.find(t => t.symbol === "USDC" && t.address) as { address: `0x${string}` } | undefined;
  const stableUSDT = tokens.find(t => t.symbol === "USDT" && t.address) as { address: `0x${string}` } | undefined;
  const stableAddr: `0x${string}` | undefined = (stableUSDC?.address ?? stableUSDT?.address) as any;

  // Per‑unit USD price for the SELL token (1 tokenIn → stable), cached & refreshed on new blocks.
  // We quote per-unit and multiply locally — avoids re-quoting on every keystroke.
  const sellToStableUnit = useYakQuote({
    router,
    tokenIn: tokenInArg,
    tokenOut: stableAddr,
    amountInHuman: "1",
    // Skip calling Yak when SELL is already the stable (saves an RPC).
    enabled: Boolean(
      stableAddr && selectedSellToken && (selectedSellToken.address?.toLowerCase() !== (stableAddr as string)?.toLowerCase())
    ),
  });

  // If USDC path failed (rare), lazily enable a USDT fallback without adding an extra call when USDC works.
  const sellToStableUnitFallback = useYakQuote({
    router,
    tokenIn: tokenInArg,
    tokenOut: stableUSDT?.address,
    amountInHuman: "1",
    enabled: Boolean(!stableUSDC && stableUSDT && selectedSellToken) ||
             Boolean(stableUSDT && (Number(sellToStableUnit?.outFormatted ?? "0") === 0)),
  });

  // Numeric USD per 1 SELL token
  const sellUsdPerUnit = (() => {
    const isSellStable = Boolean(
      stableAddr && selectedSellToken?.address &&
      selectedSellToken.address.toLowerCase() === (stableAddr as string)?.toLowerCase()
    );
    if (isSellStable) return 1;
    const pri = Number(sellToStableUnit?.outFormatted ?? "0");
    if (Number.isFinite(pri) && pri > 0) return pri;
    const fb  = Number(sellToStableUnitFallback?.outFormatted ?? "0");
    return Number.isFinite(fb) && fb > 0 ? fb : 0;
  })();

  // Derive USD per 1 BUY token using the live SELL→BUY unit rate to avoid a second RPC.
  const buyUsdPerUnit = (() => {
    const r = Number(unitQuote?.outFormatted ?? "0"); // how many BUY per 1 SELL
    if (!Number.isFinite(r) || r <= 0) return 0;
    if (!Number.isFinite(sellUsdPerUnit) || sellUsdPerUnit <= 0) return 0;
    return sellUsdPerUnit / r;
  })();

  // Derived buy amount from the active quote (do NOT apply slippage)
const buyAmountDerived = (() => {
  const baseOut = Number(quote?.outFormatted ?? NaN);
  if (!Number.isFinite(baseOut) || baseOut <= 0) return "0.00";
  return baseOut.toString();
})();


  // Display strings (no UI change)
  const sellUsdDisplay = (() => {
    const amt = Number(sellAmount || "0");
    const usd = amt * (Number.isFinite(sellUsdPerUnit) ? sellUsdPerUnit : 0);
    return formatUsd(usd);
  })();

  const buyUsdDisplay = (() => {
    const amt = Number(buyAmountDerived || "0");
    const usdPer = Number.isFinite(buyUsdPerUnit) && buyUsdPerUnit > 0
      ? buyUsdPerUnit
      : (Number.isFinite(sellUsdPerUnit) && Number.isFinite(Number(unitQuote?.outFormatted ?? "0")) && Number(unitQuote?.outFormatted ?? "0") > 0
          ? sellUsdPerUnit / Number(unitQuote?.outFormatted ?? "0")
          : 0);
    const usd = Number.isFinite(amt) ? amt * usdPer : 0;
    return formatUsd(usd);
  })();

  
const notionalUsd = useMemo(() => {
  const amt = Number(sellAmount);
  const p = Number(sellUsdPerUnit);
  if (!Number.isFinite(amt) || !Number.isFinite(p) || p <= 0) return null;
  return amt * p;
}, [sellAmount, sellUsdPerUnit]);


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


 

  // Display version limited to 6 decimals for UI
  const buyAmountDisplay = useMemo(() => {
    const num = Number(buyAmountDerived);
    if (isNaN(num)) return "0.00";
    if (num === 0) return "0.00";
    
    // Count digits before decimal point
    const integerPart = Math.floor(Math.abs(num));
    const digitCount = integerPart === 0 ? 1 : Math.floor(Math.log10(integerPart)) + 1;
    
    // Determine decimal places based on digit count
    let decimals;
    if (digitCount <= 4) {
      decimals = 6; // e.g., 1234.123456
    } else if (digitCount === 5) {
      decimals = 5; // e.g., 12345.12345
    } else if (digitCount === 6) {
      decimals = 4; // e.g., 123456.1234
    } else if (digitCount === 7) {
      decimals = 3; // e.g., 1234567.123
    } else if (digitCount === 8) {
      decimals = 2; // e.g., 12345678.12
    } else if (digitCount === 9) {
      decimals = 1; // e.g., 123456789.1
    } else {
      decimals = 0; // e.g., 1234567890
    }
    
    return num.toFixed(decimals).replace(/\.?0+$/, '');
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

    // Before typing: use the 1-unit *raw* quote
    if (unitQuote && unitQuote.outFormatted) {
       const uRaw = Number(unitQuote.outFormatted);
       if (Number.isFinite(uRaw) && uRaw > 0) {
           return `1 ${selectedSellToken?.symbol} = ${uRaw.toFixed(6).replace(/\.?0+$/, "")} ${selectedBuyToken?.symbol}`;
       }
     }

    // Nothing yet
    return `1 ${selectedSellToken.symbol} = 0.000000 ${selectedBuyToken.symbol}`;

  }, [quote, unitQuote, buyAmountDerived, sellAmount, selectedSellToken, selectedBuyToken]);

  // Determine if there's no valid route (rate = 0)
  const hasNoRoute = useMemo(() => {
    // Same tokens always have a valid 1:1 rate
    if (selectedSellToken && selectedBuyToken && selectedSellToken.symbol === selectedBuyToken.symbol) {
      return false;
    }
    
    const amt = Number(sellAmount);
    
    // User typed amount: check if output is 0
    if (Number.isFinite(amt) && amt > 0) {
      const out = Number(buyAmountDerived);
      return !Number.isFinite(out) || out <= 0;
    }
    
    // No amount typed: check 1-unit quote rate
    const unitRate = Number(unitQuote?.outFormatted ?? 0);
    return !Number.isFinite(unitRate) || unitRate <= 0;
  }, [selectedSellToken, selectedBuyToken, sellAmount, buyAmountDerived, unitQuote]);

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



  /** Formats a USD value for display.
 *  - $0.00 for non-finite or <= 0
 *  - 6 decimals when < $0.01 to show micro prices
 *  - 2 decimals otherwise
 */
function formatUsd(usd: number): string {
  if (!Number.isFinite(usd) || usd <= 0) return "$0.00";
  return usd < 0.01 ? `$${usd.toFixed(6)}` : `$${usd.toFixed(2)}`;
}

  

  
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

type TokenObj = { symbol: string; address?: `0x${string}`; name?: string; decimals?: number; logoURI?: string };

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



  // Persist dynamically selected tokens (so selectedSellToken/BuyToken can resolve)
  if (tokenObj.address) {
    const addrL = tokenObj.address.toLowerCase();
    const inCurated = tokens.some(t => t.address?.toLowerCase() === addrL);
    const inExtras  = extraTokens.some(t => t.address?.toLowerCase() === addrL);
    if (!inCurated && !inExtras) {
      setExtraTokens(prev => [
  ...prev,
  {
    symbol: tokenObj.symbol,
    name: tokenObj.name,
    address: tokenObj.address as `0x${string}`,
    logoURI: (tokenObj as any).logoURI, // NEW
  },
]);

    }
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

      const receipt = await performSwap(
        {
          router,
          tokenIn: selectedSellToken.address ?? selectedSellToken.symbol, // "MON" is fine here for native detection
          tokenOut: selectedBuyToken.address ?? selectedBuyToken.symbol,
          amountIn,
          amountOutMin: minOutRawDynamic, // dynamic, size-aware (hard-capped) slippage
          path: quote.path,
          adapters: quote.adapters,
        },
        {
          onWalletConfirmed: () => {
            // 🎵 Audio plays 0.2 seconds after wallet confirmation
            setTimeout(() => {
              swapAudioPlayer.play();
            }, 200);
          },
        }
      );

      // Show toast immediately when transaction is confirmed
      const toastTitle: React.ReactNode = (
        <div className="flex items-center gap-2 w-full pr-8">
          <img src={checkmarkIcon} alt="Confirmed" className="w-6 h-6" />
          <span className="leading-none">Swap confirmed</span>
          <a
            href={`https://monad-testnet.socialscan.io/tx/${receipt.transactionHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex-shrink-0 hover:opacity-80 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={externalLinkIcon} 
              alt="View transaction" 
              className="w-4 h-4 opacity-70 hover:opacity-100"
            />
          </a>
        </div>
      );
      
      toast({
        title: toastTitle,
        description: `Tx: ${receipt.transactionHash.slice(0, 10)}…`,
        duration: 10000,
      });

      // Instant balance refresh
      const status = (receipt as any)?.status;
      if (status === "success" || status === 1 || status === "0x1") {
        await refreshBalances();
        setSellAmount("");
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
        <Tabs value={activeTab} onValueChange={(v) => handleTabChange(v as TabKey)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-muted/40 h-10">
            <TabsTrigger value="instant" className="text-sm flex items-center gap-2 h-8 data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground">
              <span>⚡</span> Instant
            </TabsTrigger>
            <TabsTrigger value="trigger" className="text-sm flex items-center gap-2 h-8 data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground">
              <span>🔫</span> Trigger
            </TabsTrigger>
            <TabsTrigger value="recurring" disabled className="text-sm flex items-center gap-2 h-8 data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground disabled:opacity-100">
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
                    {sellBalLoading ? "…" : sellBal ? (() => {
                      const num = Number(sellBal.formatted);
                      if (num === 0) return `0.00 ${selectedSellToken?.symbol}`;
                      
                      // Dynamic decimals: 4 for <100, then decrease by 1
                      let decimals;
                      if (num < 100) decimals = 4;
                      else if (num < 1000) decimals = 3;
                      else if (num < 10000) decimals = 2;
                      else if (num < 100000) decimals = 1;
                      else decimals = 0;
                      
                      const formatted = num.toFixed(decimals).replace(/\.?0+$/, '');
                      return `${formatted} ${selectedSellToken?.symbol}`;
                    })() : `0.00 ${selectedSellToken?.symbol}`}
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
                      className={`relative ${getButtonWidth(selectedSellToken?.symbol)} h-10 bg-muted/60 rounded-full text-foreground border border-white/10 hover:border-white hover:bg-muted/80 hover:text-white flex items-center`}
                      aria-label="Select sell token"
                  >
                      {/* Left logo (shifted slightly right) */}
                  <span className="absolute left-3 flex items-center gap-2 pointer-events-none">
                    <TokenAvatar
                      symbol={selectedSellToken?.symbol}
                      address={selectedSellToken?.address as `0x${string}` | undefined}
                      size={24}
                      title={selectedSellToken?.name || selectedSellToken?.symbol}
                      logoURI={(selectedSellToken as any)?.logoURI}
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
                   {sellUsdDisplay}
                </div>
              </div>
            </div>

            {/* Swap Arrow */}
            <div className="flex justify-center -my-2 relative z-10">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSwapTokens}
                className="h-8 w-8 p-0 bg-background/60 hover:bg-white rounded-md border border-border/40 hover:border-2 hover:border-blue-600 transition-colors duration-200"
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
                    className={`relative ${getButtonWidth(selectedBuyToken?.symbol)} h-10 bg-muted/60 rounded-full text-foreground border border-white/10 hover:border-white hover:bg-muted/80 hover:text-white flex items-center`}
                    aria-label="Select buy token"
                >
                {/* Left logo (same as SELL) */}
                <span className="absolute left-3 flex items-center gap-2 pointer-events-none">
                  <TokenAvatar
                    symbol={selectedBuyToken?.symbol}
                    address={selectedBuyToken?.address as `0x${string}` | undefined}
                    size={24}
                    title={selectedBuyToken?.name || selectedBuyToken?.symbol}
                    logoURI={(selectedBuyToken as any)?.logoURI}
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
                  {buyUsdDisplay}
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
               extraTokens={extraTokens}
               setExtraTokens={setExtraTokens}

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
              isConnected && (
                !sellAmount ||
                Number(sellAmount) === 0 ||
                sellAmount === "." ||
                isExceeding ||
                hasNoRoute
              )
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
              : !sellAmount || Number(sellAmount) === 0 || sellAmount === "."
              ? "Enter an amount"
              : hasNoRoute
              ? "No route"
              : "Swap"}
          </Button>
        </div>
        )}
      </div>

      {/* Token Selection Modal */}
      <Dialog open={showTokenModal} onOpenChange={setShowTokenModal}>
        <DialogOverlay />
        <DialogContent className="sm:max-w-md bg-[#0b0f17]/95 border border-white/10 text-white">
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
                      <div className="text-sm text-white/60">{token.name || 'Unknown'}</div>
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
    </Card>
  );
};

export default SwapInterface;


