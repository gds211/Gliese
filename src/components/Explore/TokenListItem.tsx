// src/components/Explore/TokenListItem.tsx
import { cn, formatBalanceWithScale } from "@/lib/utils";
import TokenAvatar from "@/components/TokenAvatar";
import Sparkline from "./Sparkline";
import type { ExploreToken, ExploreTimeframe } from "@/hooks/useExploreFeed";

interface TokenListItemProps {
  token: ExploreToken;
  timeframe: ExploreTimeframe;
  isSelected?: boolean;
  onClick?: () => void;
  rank: number;
}

// Helper to read Moralis' nested data
function readMetric(val: unknown, tf: string): number | null {
  if (val == null) return null;
  if (typeof val === "number") return val;
  if (typeof val === "object" && val !== null) {
    const key = tf === "15m" ? "tenMinutes" : tf === "1h" ? "oneHour" : tf === "4h" ? "fourHours" : "oneDay";
    return (val as Record<string, number>)[key] ?? null;
  }
  return null;
}

function fmtPrice(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n < 0.000001) return `$${n.toExponential(2)}`;
  if (n < 0.01) return `$${n.toFixed(6)}`;
  if (n < 1) return `$${n.toFixed(4)}`;
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

export default function TokenListItem({ 
  token, 
  timeframe, 
  isSelected, 
  onClick,
  rank 
}: TokenListItemProps) {
  const change = readMetric(token.usdPricePercentChange, timeframe);
  const volume = readMetric(token.volumeUsd, timeframe);
  const isPositive = (change ?? 0) >= 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 transition-all duration-200",
        "hover:bg-white/5 border-b border-white/5 last:border-b-0",
        "group cursor-pointer text-left",
        isSelected && "bg-white/10 border-l-2 border-l-emerald-400"
      )}
    >
      {/* Rank */}
      <span className="w-6 text-xs text-white/30 font-mono tabular-nums">
        {rank}
      </span>

      {/* Token Info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <TokenAvatar 
          symbol={token.tokenSymbol} 
          address={token.tokenAddress} 
          logoURI={token.tokenLogo} 
          size={32} 
        />
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-semibold text-white truncate">
            {token.tokenSymbol}
          </span>
          <span className="text-[10px] text-white/40 truncate">
            {token.tokenName || token.tokenSymbol}
          </span>
        </div>
      </div>

      {/* Sparkline */}
      <div className="hidden sm:block">
        <Sparkline positive={isPositive} width={50} height={20} />
      </div>

      {/* Price */}
      <div className="w-24 text-right">
        <span className="text-sm font-mono text-white/90 tabular-nums">
          {fmtPrice(token.usdPrice)}
        </span>
      </div>

      {/* 24h Change */}
      <div className="w-20 text-right">
        <span className={cn(
          "text-sm font-mono font-medium tabular-nums",
          isPositive ? "text-emerald-400" : "text-red-400"
        )}>
          {fmtPct(change)}
        </span>
      </div>

      {/* Volume */}
      <div className="w-20 text-right hidden md:block">
        <span className="text-xs text-white/50 font-mono tabular-nums">
          {volume ? `$${formatBalanceWithScale(volume)}` : "—"}
        </span>
      </div>

      {/* Action Button */}
      <div className="w-16 text-right opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="px-2 py-1 text-[10px] font-medium rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          TRADE
        </span>
      </div>
    </button>
  );
}
