import * as React from "react";
import { Plus, Minus, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// If your TokenAvatar export differs, change this import (e.g. `import { TokenAvatar } from ...`)
import TokenAvatar from "@/components/TokenAvatar";

type Hex = `0x${string}`;

export type UIToken = {
  symbol: string;
  address?: Hex;
  name?: string;
  decimals?: number;
};

type ExpiryOpt = "never" | "1h" | "6h" | "24h" | "7d" | "custom";

export interface TriggerOrderPayload {
  side: "buy" | "sell";
  buyToken: UIToken | null;
  sellToken: UIToken | null;
  buyAmount: string;   // as typed by user
  sellAmount: string;  // as typed by user
  price: string;       // sellToken per 1 buyToken
  expiry: { kind: ExpiryOpt; iso?: string };
  exact: boolean;      // Exact vs Optimised
}

interface Props {
  side?: "buy" | "sell";
  buyToken: UIToken | null;
  sellToken: UIToken | null;
  onOpenTokenModal: (which: "buy" | "sell") => void;

  buyAmount?: string;
  sellAmount?: string;
  onChangeAmount: (which: "buy" | "sell", value: string) => void;

  /** price of 1 buyToken in sellToken (e.g., MON priced in USDC) */
  marketRate?: number | null;
  initialRate?: string; // optional prefilled rate string

  feeBps?: number; // e.g., 10 = 0.10%
  onPlaceOrder: (payload: TriggerOrderPayload) => void;
}

const clampNumeric = (s: string) =>
  s
    .replace(/[^\d.,]/g, "")
    .replace(",", ".")
    .replace(/^0+(?=\d)/, "0")
    .slice(0, 64);

export default function TriggerTab({
  side = "buy",
  buyToken,
  sellToken,
  onOpenTokenModal,
  buyAmount = "",
  sellAmount = "",
  onChangeAmount,
  marketRate = null,
  initialRate,
  feeBps = 10,
  onPlaceOrder,
}: Props) {
  const [mode, setMode] = React.useState<"buy" | "sell">(side);
  const [expiry, setExpiry] = React.useState<ExpiryOpt>("never");
  const [expiryISO, setExpiryISO] = React.useState<string>("");
  const [exact, setExact] = React.useState<boolean>(false);

  const [price, setPrice] = React.useState<string>(initialRate ?? "");
  React.useEffect(() => {
    // If price is empty and we have a market rate, seed it (user can override)
    if (!price && marketRate && marketRate > 0) {
      setPrice(String(marketRate));
    }
  }, [marketRate]); // eslint-disable-line

  const feeLabel = React.useMemo(() => {
    const f = (feeBps ?? 0) / 100;
    return `${f.toFixed(2)}% FEE`;
  }, [feeBps]);

  const swapIfReversed = (m: "buy" | "sell") => {
    setMode(m);
  };

  const bumpPrice = (dir: 1 | -1) => {
    const p = Number(price || "0");
    if (!isFinite(p) || p <= 0) return;
    // Nudge by 0.1% per click
    const next = p * (1 + dir * 0.001);
    setPrice(trimNum(next));
  };

  const setToMarket = () => {
    if (marketRate && marketRate > 0) setPrice(trimNum(marketRate));
  };

  const canSubmit =
    !!buyToken &&
    !!sellToken &&
    !!price &&
    Number(price) > 0 &&
    (mode === "buy" ? Number(buyAmount || 0) > 0 : Number(sellAmount || 0) > 0);

  const handleSubmit = () => {
    onPlaceOrder({
      side: mode,
      buyToken,
      sellToken,
      buyAmount,
      sellAmount,
      price,
      expiry: { kind: expiry, iso: expiry === "custom" ? expiryISO : undefined },
      exact,
    });
  };

  return (
    <Card className="w-full max-w-md mx-auto bg-muted/40 backdrop-blur-md border border-muted/60 shadow-2xl">
      <CardContent className="p-4 space-y-4">
        {/* Top controls: Buy/Sell – Expiry – Optimised/Exact */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Buy / Sell segmented */}
          <div className="inline-flex rounded-full border border-white/10 bg-background/60 p-1">
            <Button
              type="button"
              variant="ghost"
              className={`h-8 rounded-full px-4 text-sm ${
                mode === "buy"
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground"
              }`}
              onClick={() => swapIfReversed("buy")}
            >
              Buy
            </Button>
            <Button
              type="button"
              variant="ghost"
              className={`h-8 rounded-full px-4 text-sm ${
                mode === "sell"
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground"
              }`}
              onClick={() => swapIfReversed("sell")}
            >
              Sell
            </Button>
          </div>

          {/* Expiry */}
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground">Expiry</Label>
            <Select
              value={expiry}
              onValueChange={(v: ExpiryOpt) => setExpiry(v)}
            >
              <SelectTrigger className="h-8 w-[120px] rounded-full bg-muted/60 border-white/10 text-sm">
                <SelectValue placeholder="Never" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">Never</SelectItem>
                <SelectItem value="1h">In 1 hour</SelectItem>
                <SelectItem value="6h">In 6 hours</SelectItem>
                <SelectItem value="24h">In 24 hours</SelectItem>
                <SelectItem value="7d">In 7 days</SelectItem>
                <SelectItem value="custom">Custom…</SelectItem>
              </SelectContent>
            </Select>
            {expiry === "custom" && (
              <Input
                type="datetime-local"
                className="h-8 w-[180px] rounded-full bg-muted/60 border-white/10 text-sm"
                value={expiryISO}
                onChange={(e) => setExpiryISO(e.target.value)}
              />
            )}
          </div>

          {/* Optimised / Exact */}
          <div className="inline-flex rounded-full border border-white/10 bg-background/60 p-1">
            <Button
              type="button"
              variant="ghost"
              className={`h-8 rounded-full px-4 text-sm ${
                !exact
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground"
              }`}
              onClick={() => setExact(false)}
            >
              Optimised
            </Button>
            <Button
              type="button"
              variant="ghost"
              className={`h-8 rounded-full px-4 text-sm ${
                exact ? "bg-primary text-primary-foreground" : "text-foreground"
              }`}
              onClick={() => setExact(true)}
            >
              Exact
            </Button>
          </div>
        </div>

        {/* You buy */}
        <div className="relative bg-background/60 rounded-2xl border border-white/10">
          <span className="absolute left-0 bottom-full mb-2 text-sm text-muted-foreground">
            {mode === "buy" ? "You buy" : "You receive"}
          </span>

          <div className="p-3 space-y-2">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenTokenModal("buy")}
                className="relative w-40 h-10 bg-muted/60 rounded-full text-foreground border border-white/10 hover:border-white hover:bg-muted/80 hover:text-white flex items-center justify-center"
              >
                <span className="absolute left-3 flex items-center gap-2 pointer-events-none">
                  {buyToken ? (
                    <TokenAvatar
                      symbol={buyToken.symbol}
                      address={buyToken.address}
                      size={16}
                      title={buyToken.name || buyToken.symbol}
                    />
                  ) : null}
                </span>
                <span className="truncate">
                  {buyToken?.symbol ?? "Select"}
                </span>
                <ChevronDown className="absolute right-3 h-4 w-4 opacity-70" />
              </Button>

              <Input
                inputMode="decimal"
                placeholder="0.00"
                className="flex-1 h-10 rounded-xl bg-background/80 border-white/10 text-right text-lg"
                value={buyAmount}
                onChange={(e) => onChangeAmount("buy", clampNumeric(e.target.value))}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="opacity-70">≈ $—</span>
              {/* optional helper slot (e.g., min step) */}
            </div>
          </div>
        </div>

        {/* You pay */}
        <div className="relative bg-background/60 rounded-2xl border border-white/10">
          <span className="absolute left-0 bottom-full mb-2 text-sm text-muted-foreground">
            {mode === "buy" ? "You pay" : "You sell"}
          </span>

          <div className="p-3 space-y-2">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenTokenModal("sell")}
                className="relative w-40 h-10 bg-muted/60 rounded-full text-foreground border border-white/10 hover:border-white hover:bg-muted/80 hover:text-white flex items-center justify-center"
              >
                <span className="absolute left-3 flex items-center gap-2 pointer-events-none">
                  {sellToken ? (
                    <TokenAvatar
                      symbol={sellToken.symbol}
                      address={sellToken.address}
                      size={16}
                      title={sellToken.name || sellToken.symbol}
                    />
                  ) : null}
                </span>
                <span className="truncate">
                  {sellToken?.symbol ?? "Select"}
                </span>
                <ChevronDown className="absolute right-3 h-4 w-4 opacity-70" />
              </Button>

              <Input
                inputMode="decimal"
                placeholder="0.00"
                className="flex-1 h-10 rounded-xl bg-background/80 border-white/10 text-right text-lg"
                value={sellAmount}
                onChange={(e) =>
                  onChangeAmount("sell", clampNumeric(e.target.value))
                }
              />
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="opacity-70">≈ $—</span>
            </div>
          </div>
        </div>

        {/* Rate row */}
        <div className="relative bg-background/60 rounded-2xl border border-white/10 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-foreground">
                Buy {buyToken?.symbol ?? "—"} at rate
              </span>
              <Input
                inputMode="decimal"
                placeholder="0.00"
                className="h-8 w-32 rounded-xl bg-background/80 border-white/10 text-right"
                value={price}
                onChange={(e) => setPrice(clampNumeric(e.target.value))}
              />
              <span className="text-muted-foreground">
                {sellToken?.symbol ?? "—"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="link"
                className="h-8 px-0 text-sm"
                onClick={setToMarket}
                disabled={!marketRate}
              >
                set to market
              </Button>

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full border border-white/10"
                  onClick={() => bumpPrice(-1)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full border border-white/10"
                  onClick={() => bumpPrice(1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Fee pill */}
          <div className="mt-3 flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-muted/70 border border-white/10 px-3 py-1 text-xs">
              override v1.1
            </span>
            <span className="inline-flex items-center rounded-full bg-muted/70 border border-white/10 px-3 py-1 text-xs">
              {feeLabel}
            </span>
          </div>
        </div>

        {/* CTA */}
        <Button
          className="w-full h-11 rounded-xl text-base"
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          Place trigger order
        </Button>
      </CardContent>
    </Card>
  );
}

function trimNum(n: number) {
  // Pretty print to max 10 sig figs without scientific notation noise
  const s = n.toPrecision(10);
  return Number(s).toString();
}

