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
    amount: string;          // decimal string
    condition: "market" | "gte" | "lte" | "eq";
    targetPrice?: string;    // when not market
    expiryLabel: string;     // e.g. "Never"
    exactMode: boolean;
  };
};

export type TriggerOrderPanelProps = {
  sellToken: string;
  buyToken: string;
  selectedSellToken?: TokenObj;
  selectedBuyToken?: TokenObj;
  openTokenModal: (which: "sell" | "buy") => void;
  sellBalValue?: bigint;
  sellBalDecimals?: number;
  onStateChange?: (s: TriggerOrderFormState) => void;
};

// Compact sets so everything fits inside the Instant height
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
    sellToken, buyToken, selectedSellToken, selectedBuyToken,
    openTokenModal, sellBalValue, sellBalDecimals = 18, onStateChange,
  } = props;

  const [amount, setAmount] = useState("");
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

  const half = () => balanceNum > 0 && setAmount(clampDec((balanceNum / 2).toString()));
  const max  = () => balanceNum > 0 && setAmount(clampDec(balanceNum.toString()));

  const canSubmit = !!amount && (condition === "market" || !!targetPrice);

  // Inform parent so it can control the single bottom CTA
  useEffect(() => {
    onStateChange?.({
      canSubmit,
      payload: {
        sellToken: selectedSellToken?.address ?? sellToken,
        buyToken:  selectedBuyToken?.address  ?? buyToken,
        amount,
        condition,
        targetPrice: condition === "market" ? undefined : targetPrice,
        expiryLabel,
        exactMode,
      },
    });
  }, [
    canSubmit, amount, condition, targetPrice, expiryLabel, exactMode,
    sellToken, buyToken, selectedSellToken?.address, selectedBuyToken?.address, onStateChange,
  ]);

  return (
    // tighter rhythm so total height matches Instant
    <div className="space-y-2">
      {/* Row 0: HALF/MAX + Optimised/Exact */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" className="h-7 rounded-full px-3" onClick={half}>HALF</Button>
          <Button variant="secondary" size="sm" className="h-7 rounded-full px-3" onClick={max}>MAX</Button>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Optimised</span>
          <Switch checked={exactMode} onCheckedChange={setExactMode} aria-label="Toggle exact mode" />
          <span className={exactMode ? "text-foreground" : ""}>Exact</span>
        </div>
      </div>

      {/* Row 1: SELL / RECEIVE (compact) */}
      <div className="grid grid-cols-2 gap-2">
        {/* SELL */}
        <Card className="relative bg-background/60 rounded-2xl border border-white/10">
          <div className="absolute left-0 -top-3 text-[11px] text-muted-foreground select-none">sell</div>
          <div className="flex items-center justify-between p-2">
            <Button
              variant="ghost"
              onClick={() => openTokenModal("sell")}
              className="relative w-32 h-9 bg-muted/60 rounded-full text-foreground border border-white/10 hover:border-white hover:bg-muted/80 hover:text-white flex items-center"
              aria-label="Select sell token"
            >
              <span className="absolute left-2.5 flex items-center gap-2 pointer-events-none">
                <TokenAvatar
                  symbol={sellToken}
                  address={selectedSellToken?.address as `0x${string}` | undefined}
                  size={16}
                  title={selectedSellToken?.name || sellToken}
                />
              </span>
              <span className="mx-auto text-sm font-medium">{sellToken}</span>
              <ChevronDown className="absolute right-2.5 w-4 h-4 text-muted-foreground" />
            </Button>

            <Input
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(clampDec(e.target.value))}
              className="ml-2 text-right h-9 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
            />
          </div>
        </Card>

        {/* RECEIVE */}
        <Card className="relative bg-background/60 rounded-2xl border border-white/10">
          <div className="absolute left-0 -top-3 text-[11px] text-muted-foreground select-none">receive</div>
          <div className="flex items-center justify-between p-2">
            <Button
              variant="ghost"
              onClick={() => openTokenModal("buy")}
              className="relative w-32 h-9 bg-muted/60 rounded-full text-foreground border border-white/10 hover:border-white hover:bg-muted/80 hover:text-white flex items-center"
              aria-label="Select buy token"
            >
              <span className="absolute left-2.5 flex items-center gap-2 pointer-events-none">
                <TokenAvatar
                  symbol={buyToken}
                  address={selectedBuyToken?.address as `0x${string}` | undefined}
                  size={16}
                  title={selectedBuyToken?.name || buyToken}
                />
              </span>
              <span className="mx-auto text-sm font-medium">{buyToken}</span>
              <ChevronDown className="absolute right-2.5 w-4 h-4 text-muted-foreground" />
            </Button>

            <Input
              disabled
              placeholder="0.00"
              className="ml-2 text-right h-9 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
            />
          </div>
        </Card>
      </div>

      {/* Row 2: Condition + Expiry (tight grid so it still fits) */}
      <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-2">
        {/* Condition */}
        <Card className="bg-background/60 rounded-2xl border border-white/10">
          <div className="p-2 space-y-1.5">
            <div className="text-[11px] text-muted-foreground">Sell {sellToken} at</div>
            <div className="grid grid-cols-[122px_minmax(0,1fr)_92px] gap-2">
              <Select value={condition} onValueChange={(v) => setCondition(v as any)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Market" /></SelectTrigger>
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
                className="h-9 text-sm"
              />

              <Button
                variant="outline"
                className="h-9 justify-start text-sm"
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
          <div className="p-2 space-y-1.5">
            <div className="text-[11px] text-muted-foreground">Expiry</div>
            <Select value={expiryLabel} onValueChange={setExpiryLabel}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Never" /></SelectTrigger>
              <SelectContent>
                {EXPIRY_OPTIONS.map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>
      </div>

      {/* No extra meta/CTA rows here — the parent provides the single bottom CTA just like Instant */}
    </div>
  );
}
