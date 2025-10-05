// src/components/TriggerOrderPanel.tsx
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import TokenAvatar from "@/components/TokenAvatar";
import { ChevronDown } from "lucide-react";

type TokenObj = { symbol: string; address?: `0x${string}`; name?: string; decimals?: number };

export type TriggerOrderFormState = {
  canSubmit: boolean;
  payload: {
    sellToken: string | `0x${string}`;
    buyToken: string | `0x${string}`;
    sellAmount: string;
    receiveAmount?: string;
    condition: "market" | "gte" | "lte" | "eq";
    targetPrice?: string;
    expiryLabel: string;
    exactMode: boolean;
  };
};

export type TriggerOrderPanelProps = {
  isConnected?: boolean;
  onConnect?: () => void;

  sellToken: string;
  buyToken: string;
  selectedSellToken?: TokenObj;
  selectedBuyToken?: TokenObj;
  openTokenModal: (which: "sell" | "buy") => void;

  sellBalValue?: bigint;
  sellBalDecimals?: number;

  onStateChange?: (s: TriggerOrderFormState) => void;
};

const CONDITION_OPTIONS = [
  { key: "market", label: "Market" },
  { key: "gte",    label: "Price ≥" },
  { key: "lte",    label: "Price ≤" },
  { key: "eq",     label: "Price ="  },
] as const;

const EXPIRY_OPTIONS = ["Never", "1 hour", "6 hours", "1 day", "7 days", "30 days"];

function weiToFloat(value: bigint, decimals: number): number {
  if (!decimals) return Number(value);
  const s = value.toString().padStart(decimals + 1, "0");
  const int = s.slice(0, -decimals) || "0";
  const frac = s.slice(-decimals).replace(/0+$/, "");
  return Number(`${int}${frac ? "." + frac : ""}`);
}

const clampDec = (v: string) =>
  v.replace(/[^\d.]/g, "")
   .replace(/^(\d*\.?\d{0,18}).*$/, "$1")
   .replace(/^0+(\d)/, "$1");

export default function TriggerOrderPanel(props: TriggerOrderPanelProps) {
  const {
    isConnected, onConnect,
    sellToken, buyToken, selectedSellToken, selectedBuyToken,
    openTokenModal, sellBalValue, sellBalDecimals = 18, onStateChange,
  } = props;

  const [sellAmount, setSellAmount] = useState("");
  const [receiveAmount, setReceiveAmount] = useState("");
  const [condition, setCondition] = useState<"market" | "gte" | "lte" | "eq">("market");
  const [targetPrice, setTargetPrice] = useState("");
  const [expiryLabel, setExpiryLabel] = useState("Never");
  const [exactMode, setExactMode] = useState(false);

  const balanceNum = useMemo(() => {
    try {
      if (!sellBalValue) return 0;
      return weiToFloat(sellBalValue, sellBalDecimals);
    } catch { return 0; }
  }, [sellBalValue, sellBalDecimals]);

  const half = () => balanceNum > 0 && setSellAmount(clampDec((balanceNum / 2).toString()));
  const max  = () => balanceNum > 0 && setSellAmount(clampDec(balanceNum.toString()));

  const canSubmit =
    !!sellAmount &&
    (condition === "market" || !!targetPrice);

  // notify parent so it can control the single bottom CTA
  useEffect(() => {
    onStateChange?.({
      canSubmit,
      payload: {
        sellToken: selectedSellToken?.address ?? sellToken,
        buyToken:  selectedBuyToken?.address  ?? buyToken,
        sellAmount,
        receiveAmount: receiveAmount || undefined,
        condition,
        targetPrice: condition === "market" ? undefined : targetPrice,
        expiryLabel,
        exactMode,
      },
    });
  }, [
    canSubmit, sellAmount, receiveAmount, condition, targetPrice, expiryLabel, exactMode,
    sellToken, buyToken, selectedSellToken?.address, selectedBuyToken?.address, onStateChange,
  ]);

  return (
    <div className="space-y-3">
      {/* Row 0: HALF / MAX + Optimised/Exact */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" className="h-8 rounded-full px-3" onClick={half}>HALF</Button>
          <Button variant="secondary" size="sm" className="h-8 rounded-full px-3" onClick={max}>MAX</Button>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Optimised</span>
          <Switch checked={exactMode} onCheckedChange={setExactMode} aria-label="Toggle exact mode" />
          <span className={exactMode ? "text-foreground" : ""}>Exact</span>
        </div>
      </div>

      {/* Row 1: SELL / RECEIVE — match Instant tab dimensions */}
      <div className="grid grid-cols-2 gap-3">
        {/* SELL */}
        <Card className="relative bg-background/60 rounded-2xl border border-white/10">
          <div className="absolute left-0 -top-3 text-xs text-muted-foreground select-none">sell</div>
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
                value={sellAmount}
                onChange={(e) => setSellAmount(clampDec(e.target.value))}
                className="text-right h-10 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-lg"
              />
            </div>
          </div>
        </Card>

        {/* RECEIVE (optional min amount) */}
        <Card className="relative bg-background/60 rounded-2xl border border-white/10">
          <div className="absolute left-0 -top-3 text-xs text-muted-foreground select-none">receive (min)</div>
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
                  size={16}
                  title={selectedBuyToken?.name || buyToken}
                />
              </span>
              <span className="mx-auto text-sm font-medium">{buyToken}</span>
              <ChevronDown className="absolute right-3 w-4 h-4 text-muted-foreground" />
            </Button>

            <div className="relative flex-1 ml-3">
              <Input
                inputMode="decimal"
                pattern="[0-9]*[.,]?[0-9]*"
                placeholder="0.00"
                value={receiveAmount}
                onChange={(e) => setReceiveAmount(clampDec(e.target.value))}
                className="text-right h-10 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-lg"
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Row 2: Condition + Expiry */}
      <div className="grid grid-cols-2 gap-3">
        {/* Condition */}
        <Card className="bg-background/60 rounded-2xl border border-white/10">
          <div className="p-3 space-y-2">
            <div className="text-xs text-muted-foreground">Sell {sellToken} at</div>
            <div className="grid grid-cols-[130px_1fr_100px] gap-2">
              <Select value={condition} onValueChange={(v) => setCondition(v as any)}>
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
                onChange={(e) => setTargetPrice(clampDec(e.target.value))}
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

        {/* Expiry */}
        <Card className="bg-background/60 rounded-2xl border border-white/10">
          <div className="p-3 space-y-2">
            <div className="text-xs text-muted-foreground">Expiry</div>
            <Select value={expiryLabel} onValueChange={setExpiryLabel}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Never" />
              </SelectTrigger>
              <SelectContent>
                {EXPIRY_OPTIONS.map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>
      </div>

      {/* no CTA here — parent renders the single bottom CTA */}
    </div>
  );
}
