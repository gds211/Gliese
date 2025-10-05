// src/components/TriggerOrderPanel.tsx
import {useMemo, useState} from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import TokenAvatar from "@/components/TokenAvatar";
import glieseLogo from "@/assets/gliese-logo.png";
import { ChevronDown } from "lucide-react";

type TokenObj = { symbol: string; address?: `0x${string}`; name?: string; decimals?: number };

function weiToFloat(value: bigint, decimals: number): number {
  if (!decimals) return Number(value);
  const s = value.toString().padStart(decimals + 1, "0");
  const int = s.slice(0, -decimals) || "0";
  const frac = s.slice(-decimals).replace(/0+$/, "");
  return Number(`${int}${frac ? "." + frac : ""}`);
}

export type TriggerOrderPanelProps = {
  // token state from SwapInterface (keeps selection + modal consistent)
  sellToken: string;
  buyToken: string;
  selectedSellToken?: TokenObj;
  selectedBuyToken?: TokenObj;
  openTokenModal: (which: "sell" | "buy") => void;

  // balance for HALF / MAX (optional)
  sellBalValue?: bigint;
  sellBalDecimals?: number;

  // wallet connect from parent (same behaviour as “Instant”)
  isConnected: boolean;
  onConnect?: () => void;
};

const EXPIRY_OPTIONS: { label: string; seconds?: number }[] = [
  { label: "Never" },
  { label: "1 hour", seconds: 60 * 60 },
  { label: "6 hours", seconds: 6 * 60 * 60 },
  { label: "1 day", seconds: 24 * 60 * 60 },
  { label: "7 days", seconds: 7 * 24 * 60 * 60 },
  { label: "30 days", seconds: 30 * 24 * 60 * 60 },
];

const CONDITION_OPTIONS = [
  { key: "market", label: "Market" },
  { key: "gte", label: "Price ≥" },
  { key: "lte", label: "Price ≤" },
  { key: "eq",  label: "Price =" },
] as const;
type ConditionKey = typeof CONDITION_OPTIONS[number]["key"];

export default function TriggerOrderPanel(props: TriggerOrderPanelProps) {
  const {
    isConnected,
    onConnect,
    sellToken,
    buyToken,
    selectedSellToken,
    selectedBuyToken,
    openTokenModal,
    sellBalValue,
    sellBalDecimals = 18,
  } = props;

  // ----- local UI state (only for trigger orders) -----
  const [amount, setAmount] = useState<string>("");
  const [condition, setCondition] = useState<ConditionKey>("market");
  const [targetPrice, setTargetPrice] = useState<string>("");
  const [expiry, setExpiry] = useState<string>("Never");
  const [exactMode, setExactMode] = useState<boolean>(false);

  // balance → numbers for HALF / MAX
  const balanceNum = useMemo(() => {
    try {
      if (!sellBalValue) return 0;
      return weiToFloat(sellBalValue, sellBalDecimals);
    } catch {
      return 0;
    }
  }, [sellBalValue, sellBalDecimals]);

  const normalizeNum = (v: string) =>
    v.replace(/[^\d.]/g, "")
      .replace(/^0+(\d)/, "$1")
      .replace(/^(\d*\.?\d{0,18}).*$/, "$1");

  const handleHalf = () => {
    if (balanceNum <= 0) return;
    setAmount(normalizeNum((balanceNum / 2).toString()));
  };
  const handleMax = () => {
    if (balanceNum <= 0) return;
    setAmount(normalizeNum(balanceNum.toString()));
  };

  const canSubmit =
    isConnected &&
    !!amount &&
    (condition === "market" || !!targetPrice);

  return (
    <div className="space-y-3">
      {/* quick actions + Optimised/Exact (top row stays fixed; extra UI grows downward) */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" className="h-7 rounded-full px-3" onClick={handleHalf}>
            HALF
          </Button>
          <Button variant="secondary" size="sm" className="h-7 rounded-full px-3" onClick={handleMax}>
            MAX
          </Button>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Optimised</span>
          <Switch checked={exactMode} onCheckedChange={setExactMode} aria-label="Toggle exact mode" />
          <span className={exactMode ? "text-foreground" : "text-muted-foreground"}>Exact</span>
        </div>
      </div>

      {/* SELL / RECEIVE boxes (same height as your Instant tab) */}
      <div className="grid grid-cols-2 gap-3">
        {/* SELL */}
        <Card className="relative bg-background/60 rounded-2xl border border-white/10">
          <div className="absolute left-0 -top-3 text-xs text-muted-foreground select-none">sell</div>
          <div className="flex items-center justify-between p-3">
            <Button
              variant="ghost"
              onClick={() => openTokenModal("sell")}
              className="relative w-36 h-10 bg-muted/60 rounded-full text-foreground border border-white/10 hover:border-white hover:bg-muted/80 hover:text-white flex items-center"
              aria-label="Select sell token"
            >
              <span className="absolute left-3 flex items-center gap-2 pointer-events-none">
                <TokenAvatar
                  symbol={sellToken}
                  address={selectedSellToken?.address as `0x${string}` | undefined}
                  size={16}
                  title={selectedSellToken?.name || sellToken}
                />
              </span>
              <span className="mx-auto text-sm font-medium">{sellToken}</span>
              <ChevronDown className="absolute right-3 w-4 h-4 text-muted-foreground" />
            </Button>

            <div className="relative flex-1 ml-3">
              <Input
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]*"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(normalizeNum(e.target.value))}
                className="text-right h-10 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-lg"
              />
            </div>
          </div>
          <div className="text-right text-sm text-muted-foreground pr-3 pb-3">{/* USD hint (optional) */}</div>
        </Card>

        {/* RECEIVE */}
        <Card className="relative bg-background/60 rounded-2xl border border-white/10">
          <div className="absolute left-0 -top-3 text-xs text-muted-foreground select-none">receive</div>
          <div className="flex items-center justify-between p-3">
            <Button
              variant="ghost"
              onClick={() => openTokenModal("buy")}
              className="relative w-36 h-10 bg-muted/60 rounded-full text-foreground border border-white/10 hover:border-white hover:bg-muted/80 hover:text-white flex items-center"
              aria-label="Select buy token"
            >
              <span className="absolute left-3 flex items-center gap-2 pointer-events-none">
                <TokenAvatar
                  symbol={buyToken}
                  address={selectedBuyToken?.address as `0x${string}` | undefined}
                  size={16}
                  title={selectedBuyToken?.name || buyToken}
                />
              </span>
              <span className="mx-auto text-sm font-medium">{buyToken}</span>
              <ChevronDown className="absolute right-3 w-4 h-4 text-muted-foreground" />
            </Button>

            <div className="relative flex-1 ml-3">
              <Input disabled placeholder="0.00" className="text-right h-10 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-lg" />
            </div>
          </div>
          <div className="text-right text-sm text-muted-foreground pr-3 pb-3">&nbsp;</div>
        </Card>
      </div>

      {/* condition + expiry (this extra row is what “expands downward”) */}
      <div className="grid grid-cols-2 gap-3">
        {/* condition builder */}
        <Card className="bg-background/60 rounded-2xl border border-white/10">
          <div className="p-3 space-y-2">
            <div className="text-xs text-muted-foreground">Sell {sellToken} at</div>

            <div className="grid grid-cols-[130px_1fr_90px] gap-2">
              <Select value={condition} onValueChange={(v) => setCondition(v as ConditionKey)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Market" />
                </SelectTrigger>
                <SelectContent>
                  {CONDITION_OPTIONS.map((o) => (
                    <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                disabled={condition === "market"}
                placeholder={condition === "market" ? "Market price" : "Target price"}
                value={targetPrice}
                onChange={(e) => setTargetPrice(normalizeNum(e.target.value))}
                className="h-9"
              />

              <Button
                variant="outline"
                className="h-9 justify-start"
                onClick={() => openTokenModal("buy")}
                aria-label="Select quote token"
              >
                <TokenAvatar
                  symbol={buyToken}
                  address={selectedBuyToken?.address as `0x${string}` | undefined}
                  size={14}
                  title={selectedBuyToken?.name || buyToken}
                />
                <span className="ml-2">{buyToken}</span>
                <ChevronDown className="ml-auto w-4 h-4 opacity-60" />
              </Button>
            </div>
          </div>
        </Card>

        {/* expiry */}
        <Card className="bg-background/60 rounded-2xl border border-white/10">
          <div className="p-3 space-y-2">
            <div className="text-xs text-muted-foreground">Expiry</div>
            <Select value={expiry} onValueChange={setExpiry}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Never" />
              </SelectTrigger>
              <SelectContent>
                {EXPIRY_OPTIONS.map((o) => (
                  <SelectItem key={o.label} value={o.label}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>
      </div>

      {/* footer row */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1 border-2 border-border px-2 py-1 rounded-lg">
          <img src={glieseLogo} alt="Gliese" className="w-4 h-4 rounded-lg" />
          <span>Wrapdrive v1.1</span>
        </div>
        <span>0.10% FEE</span>
      </div>

      {/* primary action */}
      <div className="pt-2">
        <Button
          className="w-full h-11 rounded-xl text-base font-semibold"
          disabled={!canSubmit}
          onClick={() => {
            if (!isConnected) {
              props.onConnect?.();
              return;
            }
            // placeholder handler – wire this to your on-chain trigger later
            console.log("Create trigger order", {
              sellToken: selectedSellToken?.address ?? sellToken,
              buyToken:  selectedBuyToken?.address  ?? buyToken,
              amount,
              condition,
              targetPrice: condition === "market" ? "market" : targetPrice,
              expiry,
              exactMode,
            });
          }}
        >
          {!isConnected ? "Connect Wallet" : "Place trigger order"}
        </Button>
      </div>
    </div>
  );
}

