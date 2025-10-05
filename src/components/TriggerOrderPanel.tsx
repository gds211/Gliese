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
    amount: string;
    condition: "market" | "gte" | "lte" | "eq";
    targetPrice?: string;
    expiryLabel: string;
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
    <div className="space-y-3">{/* same vertical rhythm as Instant */}
      {/* Row 0: HALF / MAX + Optimised ↔ Exact */}
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

      {/* Row 1: SELL / RECEIVE (left: token; right: amount) */}
      <div className="grid grid-cols-2 gap-3">
        {/* SELL */}
        <Card className="relative bg-background/60 rounded-2xl border border-white/10">
          <div className="absolute left-0 -top-3 text-xs text-muted-foreground select-none">sell</div>
          <div className="flex items-center gap-3 p-3">
            <Button
              variant="ghost"
              onClick={() => openTokenModal("sell")}
              className="w-36 h-10 bg-muted/60 rounded-full text-foreground border border-white/10 hover:border-white hover:bg-muted/80 hover:text-white flex items-center justify-between px-3"
              aria-label="Select sell token"
            >
              <span className="flex items-center gap-2 min-w-0">
                <TokenAvatar
                  symbol={selectedSellToken?.symbol ?? sellToken}
                  address={selectedSellToken?.address as `0x${string}` | undefined}
                  size={16}
                  title={selectedSellToken?.name || sellToken}
                />
                <span className="truncate text-sm font-medium">
                  {selectedSellToken?.symbol ?? sellToken}
                </span>
              </span>
              <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
            </Button>

            <Input
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(clampDec(e.target.value))}
              className="flex-1 text-right h-10 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-lg"
            />
          </div>
        </Card>

        {/* RECEIVE */}
        <Card className="relative bg-background/60 rounded-2xl border border-white/10">
          <div className="absolute left-0 -top-3 text-xs text-muted-foreground select-none">receive</div>
          <div className="flex items-center gap-3 p-3">
            <Button
              variant="ghost"
              onClick={() => openTokenModal("buy")}
              className="w-36 h-10 bg-muted/60 rounded-full text-foreground border border-white/10 hover:border-white hover:bg-muted/80 hover:text-white flex items-center justify-between px-3"
              aria-label="Select buy token"
            >
              <span className="flex items-center gap-2 min-w-0">
                <TokenAvatar
                  symbol={selectedBuyToken?.symbol ?? buyToken}
                  address={selectedBuyToken?.address as `0x${string}` | undefined}
                  size={16}
                  title={selectedBuyToken?.name || buyToken}
                />
                <span className="truncate text-sm font-medium">
                  {selectedBuyToken?.symbol ?? buyToken}
                </span>
              </span>
              <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
            </Button>

            <Input
              disabled
              placeholder="—"
              className="flex-1 text-right h-10 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-lg"
            />
          </div>
        </Card>
      </div>

      {/* Row 2: Condition + Expiry */}
      <div className="grid grid-cols-2 gap-3">
        {/* Condition */}
        <Card className="bg-background/60 rounded-2xl border border-white/10">
          <div className="p-3 space-y-2">
            <div className="text-xs text-muted-foreground">Sell {selectedSellToken?.symbol ?? sellToken} at</div>
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
                  symbol={selectedBuyToken?.symbol ?? buyToken}
                  address={selectedBuyToken?.address as `0x${string}` | undefined}
                  size={14}
                  title={selectedBuyToken?.name || buyToken}
                />
                <span className="ml-2 truncate">{selectedBuyToken?.symbol ?? buyToken}</span>
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

      {/* No CTA here — parent renders the single bottom CTA */}
    </div>
  );
}
