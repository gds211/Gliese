// src/components/SwapInterface.tsx
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowUpDown, Wallet, Search, ChevronDown } from "lucide-react";
import { useAccount } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { useToast } from "@/components/ui/use-toast";
import { PUBLIC_CONFIG } from "@/config/public";
import { useTokenBalance, toDecimalStringFloor, type TokenMeta } from "@/hooks/useTokenBalance";
import glieseLogo from "@/assets/gliese-logo.png";

const NATIVE_SYMBOL = PUBLIC_CONFIG.NATIVE_SYMBOL;
const NATIVE_DECIMALS = PUBLIC_CONFIG.NATIVE_DECIMALS;

// ~ buffer to keep when selling native so user can still pay gas
const NATIVE_GAS_BUFFER = parseUnits("0.03", NATIVE_DECIMALS);

// Mock crypto prices in USD (placeholder)
const cryptoPrices = {
  MON: 0.00215,
  USDC: 1.0,
  USDT: 1.0,
  DAI: 1.0,
  ETH: 2650.0,
  BTC: 43500.0
};

// Your token list (sell modal uses this)
const TOKENS: TokenMeta[] = [
  { symbol: NATIVE_SYMBOL }, // native coin — no address
  { symbol: "USDC", address: "0xf817257fed379853cDe0fa4F97AB987181B1E5Ea" as `0x${string}` },
  { symbol: "USDT", address: "0x88b8E2161DEDC77EF4ab7585569D2415a1C1055D" as `0x${string}` },
  { symbol: "CHOG", address: "0xE0590015A873bF326bd645c3E1266d4db41C4E6B" as `0x${string}` },
  { symbol: "aprMON", address: "0xb2f82D0f38dc453D596Ad40A37799446Cc89274A" as `0x${string}` },
  { symbol: "WMON", address: "0x760AfE86e5de5fa0Ee542fc7B7B713e1c5425701" as `0x${string}` },
  { symbol: "DAK", address: "0x0F0BDEbF0F83cD1EE3974779Bcb7315f9808c714" as `0x${string}` },
];

const SwapInterface = () => {
  // ===== STATE =====
  const [sellAmount, setSellAmount] = useState("");
  const [buyAmount, setBuyAmount] = useState("0");
  const [sellTokenSym, setSellTokenSym] = useState<string>(NATIVE_SYMBOL);
  const [buyTokenSym, setBuyTokenSym] = useState<string>("USDC");
  const [priceRate, setPriceRate] = useState(`1 ${NATIVE_SYMBOL} = 0.00215 USDC`);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenSelectionType, setTokenSelectionType] = useState<'sell' | 'buy'>('sell');
  const [searchTerm, setSearchTerm] = useState("");

  const { isConnected } = useAccount();
  const { toast } = useToast();

  // Map selected symbols to token meta
  const sellToken = useMemo<TokenMeta | undefined>(() => TOKENS.find(t => t.symbol === sellTokenSym), [sellTokenSym]);
  const buyToken = useMemo<TokenMeta | undefined>(() => TOKENS.find(t => t.symbol === buyTokenSym), [buyTokenSym]);

  // Live balance for selected sell token
  const sellBal = useTokenBalance(sellToken);

  // Derived: available to use (if native keep buffer)
  const isNativeSell = !!sellToken && !sellToken.address;
  const availableRaw: bigint = useMemo(() => {
    if (!sellToken) return 0n;
    if (isNativeSell) {
      const diff = sellBal.raw - NATIVE_GAS_BUFFER;
      return diff > 0n ? diff : 0n;
    }
    return sellBal.raw;
  }, [sellToken, isNativeSell, sellBal.raw]);

  const availableFmt = useMemo(
    () => toDecimalStringFloor(availableRaw, sellBal.decimals),
    [availableRaw, sellBal.decimals]
  );

  // Clamp input on change
  function onSellChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = sanitizeNumeric(e.target.value);
    setSellAmount(clampToBalance(v, sellBal.decimals, availableRaw));
  }

  // HALF/MAX
  function onHalf() {
    if (!isConnected) return toast({ title: "Connect your wallet", description: "You need to connect before using HALF.", variant: "destructive" });
    if (!sellToken) return toast({ title: "Select a token", variant: "destructive" });
    const half = availableRaw / 2n;
    const val = toDecimalStringFloor(half, sellBal.decimals);
    setSellAmount(val);
    toast({ title: "Filled HALF", description: `${val} ${sellToken.symbol}` });
  }
  function onMax() {
    if (!isConnected) return toast({ title: "Connect your wallet", description: "You need to connect before using MAX.", variant: "destructive" });
    if (!sellToken) return toast({ title: "Select a token", variant: "destructive" });
    const val = toDecimalStringFloor(availableRaw, sellBal.decimals);
    setSellAmount(val);
    toast({ title: "Filled MAX", description: `${val} ${sellToken.symbol}` });
  }

  // Reset input when token changes
  useEffect(() => {
    setSellAmount("");
  }, [sellTokenSym]);

  // ===== EXISTING LOGIC: prices / USD display / modal =====
  const calculateUSDValue = (amount: string, symbol: string): string => {
    const numAmount = parseFloat(amount) || 0;
    const price = cryptoPrices[symbol as keyof typeof cryptoPrices] || 0;
    const usdValue = numAmount * price;
    return usdValue < 0.01 && usdValue > 0 ? `$${usdValue.toFixed(6)}` : `$${usdValue.toFixed(2)}`;
  };

  const formatAddress = (address: string): string => `${address.slice(0, 6)}...${address.slice(-6)}`;

  const handleSwapTokens = () => {
    const tempToken = sellTokenSym;
    setSellTokenSym(buyTokenSym);
    setBuyTokenSym(tempToken);
    const tempAmount = sellAmount;
    setSellAmount(buyAmount);
    setBuyAmount(tempAmount);
  };

  const openTokenModal = (type: 'sell' | 'buy') => {
    setTokenSelectionType(type);
    setShowTokenModal(true);
    setSearchTerm("");
  };

  const selectToken = (symbol: string) => {
    if (tokenSelectionType === 'sell') setSellTokenSym(symbol);
    else setBuyTokenSym(symbol);
    setShowTokenModal(false);
  };

  useEffect(() => {
    const updatePriceRate = () => {
      const sellPrice = cryptoPrices[sellTokenSym as keyof typeof cryptoPrices] || 0;
      const buyPrice = cryptoPrices[buyTokenSym as keyof typeof cryptoPrices] || 0;
      const rate = sellPrice > 0 && buyPrice > 0 ? (1 * sellPrice) / buyPrice : 0;
      setPriceRate(`1 ${sellTokenSym} = ${rate.toFixed(6)} ${buyTokenSym}`);
    };
    updatePriceRate();
    const interval = setInterval(updatePriceRate, 20000);
    return () => clearInterval(interval);
  }, [sellTokenSym, buyTokenSym]);

  const filteredTokens = TOKENS.filter(t =>
    t.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ===== RENDER =====
  return (
    <Card className="w-full max-w-md mx-auto bg-muted/40 backdrop-blur-md border border-muted/60 shadow-2xl">
      <div className="p-4 space-y-4">
        {/* Tabs */}
        <Tabs defaultValue="instant" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-muted/40 h-10">
            <TabsTrigger value="instant" className="text-sm flex items-center gap-2 h-8 data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground">
              <span>⚡</span> Instant
            </TabsTrigger>
            <TabsTrigger value="trigger" className="text-sm flex items-center gap-2 h-8 data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground">
              <span>🔫</span> Trigger
            </TabsTrigger>
            <TabsTrigger value="recurring" className="text-sm flex items-center gap-2 h-8 data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground">
              <span>🔁</span> Recurring
            </TabsTrigger>
          </TabsList>
          <TabsContent value="instant" className="mt-2">
            {/* Sell Card */}
            <div className="bg-background/60 border border-muted/50 rounded-2xl p-4 space-y-3">
              {/* Balance + HALF/MAX row */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Wallet className="h-3 w-3" />
                  <span>
                    Balance: {sellBal.isLoading ? "…" : `${sellBal.formatted} ${sellToken?.symbol ?? ""}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="xs" variant="secondary" onClick={onHalf} disabled={!isConnected || sellBal.isLoading}>HALF</Button>
                  <Button size="xs" variant="secondary" onClick={onMax} disabled={!isConnected || sellBal.isLoading}>MAX</Button>
                </div>
              </div>

              {/* Sell input row */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    onClick={() => openTokenModal('sell')}
                    className="w-36 h-9 bg-muted/60 rounded-full border border-white/10 hover:bg-muted/80 flex items-center justify-between"
                  >
                    <span>{sellTokenSym}</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                  <Input 
                    value={sellAmount}
                    onChange={onSellChange}
                    className="!border-none !bg-transparent text-right flex-1 text-3xl font-medium tracking-tight pr-2 h-auto text-foreground !shadow-none !ring-0 !ring-offset-0"
                    placeholder="0.00"
                    inputMode="decimal"
                  />
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  {calculateUSDValue(sellAmount, sellTokenSym)}
                </div>
                {isNativeSell && (
                  <div className="text-right text-[11px] text-muted-foreground">
                    MAX keeps ~{formatUnits(NATIVE_GAS_BUFFER, NATIVE_DECIMALS)} {NATIVE_SYMBOL} for gas
                  </div>
                )}
              </div>
            </div>

            {/* Swap Arrow */}
            <div className="flex justify-center -my-2 relative z-10">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSwapTokens}
                className="h-8 w-8 p-0 rounded-full border border-white/10 bg-background/80 hover:bg-background"
                aria-label="Swap tokens"
                title="Swap tokens"
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </div>

            {/* Buy Card */}
            <div className="bg-background/60 border border-muted/50 rounded-2xl p-4 space-y-1">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  onClick={() => openTokenModal('buy')}
                  className="w-36 h-9 bg-muted/60 rounded-full border border-white/10 hover:bg-muted/80 flex items-center justify-between"
                >
                  <span>{buyTokenSym}</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
                <Input 
                  value={(() => {
                    const sellPrice = cryptoPrices[sellTokenSym as keyof typeof cryptoPrices] || 0;
                    const buyPrice = cryptoPrices[buyTokenSym as keyof typeof cryptoPrices] || 0;
                    const sellAmountNum = parseFloat(sellAmount) || 0;
                    if (sellPrice > 0 && buyPrice > 0 && sellAmountNum > 0) {
                      const calculatedAmount = (sellAmountNum * sellPrice) / buyPrice;
                      return calculatedAmount.toFixed(6);
                    }
                    return buyAmount;
                  })()}
                  onChange={(e) => setBuyAmount(e.target.value)}
                  className="!border-none !bg-transparent text-right flex-1 text-3xl font-medium tracking-tight pr-2 h-auto text-foreground !shadow-none !ring-0 !ring-offset-0"
                  placeholder="0.00"
                  readOnly
                />
              </div>
              <div className="text-right text-sm text-muted-foreground">
                {calculateUSDValue(buyAmount, buyTokenSym)}
              </div>
            </div>

            {/* Rate */}
            <div className="text-xs text-muted-foreground text-right mt-2">
              {priceRate}
            </div>
          </TabsContent>
        </Tabs>

        {/* Token Modal */}
        <Dialog open={showTokenModal} onOpenChange={setShowTokenModal}>
          <DialogContent className="sm:max-w-[480px] bg-[#0b0f17]/95 border border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="text-white">
                Select a token to {tokenSelectionType === 'sell' ? 'sell' : 'buy'}
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
            <ScrollArea className="h-[30rem] w-full pr-4">
              <div className="space-y-2">
                {filteredTokens.map((t) => (
                  <Button
                    key={t.symbol}
                    variant="ghost"
                    className="w-full justify-between py-3 px-3 rounded-xl border border-white/10 hover:bg-white/5"
                    onClick={() => selectToken(t.symbol)}
                  >
                    <div className="flex items-center">
                      <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                        <img src={glieseLogo} alt={t.symbol} className="w-6 h-6" />
                      </div>
                      <div className="ml-3 text-left">
                        <div className="font-medium text-white">{t.symbol}</div>
                        <div className="text-xs text-white/60">{t.name ?? `${t.symbol} token`}</div>
                      </div>
                    </div>
                    <div className="text-right text-xs text-white/60">
                      {t.address ? formatAddress(t.address) : "Native coin"}
                    </div>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </Card>
  );
};

export default SwapInterface;

// ===== Helpers =====
function sanitizeNumeric(v: string): string {
  let out = v.replace(/[^0-9.]/g, "");
  const firstDot = out.indexOf(".");
  if (firstDot !== -1) out = out.slice(0, firstDot + 1) + out.slice(firstDot + 1).replace(/\./g, "");
  if (out.startsWith("00")) out = out.replace(/^0+/, "0");
  return out;
}

function clampToBalance(input: string, decimals: number, maxRaw: bigint): string {
  if (!input) return "";
  try {
    const asRaw = parseUnits(input, decimals);
    if (asRaw > maxRaw) return toDecimalStringFloor(maxRaw, decimals);
    const [w, f = ""] = input.split(".");
    if (f.length > decimals) return `${w}.${f.slice(0, decimals)}`;
    return input;
  } catch {
    return input;
  }
}

function formatAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
}



