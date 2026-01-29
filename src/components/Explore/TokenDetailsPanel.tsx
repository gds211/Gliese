// src/components/Explore/TokenDetailsPanel.tsx
import { cn, formatBalanceWithScale } from "@/lib/utils";
import TokenAvatar from "@/components/TokenAvatar";
import type { ExploreToken, ExploreTimeframe } from "@/hooks/useExploreFeed";
import { TrendingUp, TrendingDown, ExternalLink, Copy, Shield, Droplets, Users, Activity } from "lucide-react";
import { useMemo } from "react";

interface TokenDetailsPanelProps {
  token: ExploreToken | null;
  timeframe: ExploreTimeframe;
}

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

// Simple chart component for the details panel
function AreaChart({ positive }: { positive: boolean }) {
  const points = useMemo(() => {
    const data: number[] = [];
    let value = 50;
    for (let i = 0; i < 50; i++) {
      const trend = positive ? 0.4 : -0.4;
      const noise = (Math.random() - 0.5) * 8;
      value = Math.max(10, Math.min(90, value + trend + noise));
      data.push(value);
    }
    return data;
  }, [positive]);

  const width = 320;
  const height = 120;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const linePath = points.map((value, index) => {
    const x = (index / (points.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 10) - 5;
    return `${index === 0 ? "M" : "L"} ${x},${y}`;
  }).join(" ");

  const areaPath = `${linePath} L ${width},${height} L 0,${height} Z`;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={positive ? "rgb(16, 185, 129)" : "rgb(239, 68, 68)"} stopOpacity="0.3" />
          <stop offset="100%" stopColor={positive ? "rgb(16, 185, 129)" : "rgb(239, 68, 68)"} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#chartGradient)" />
      <path d={linePath} fill="none" stroke={positive ? "rgb(16, 185, 129)" : "rgb(239, 68, 68)"} strokeWidth="2" />
    </svg>
  );
}

export default function TokenDetailsPanel({ token, timeframe }: TokenDetailsPanelProps) {
  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
          <Activity className="w-8 h-8 text-white/20" />
        </div>
        <p className="text-white/40 text-sm">Select a token to view details</p>
      </div>
    );
  }

  const change = readMetric(token.usdPricePercentChange, timeframe);
  const volume = readMetric(token.volumeUsd, timeframe);
  const isPositive = (change ?? 0) >= 0;
  const score = token.securityScore ?? 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-start gap-4">
          <TokenAvatar 
            symbol={token.tokenSymbol} 
            address={token.tokenAddress} 
            logoURI={token.tokenLogo} 
            size={48} 
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white truncate">{token.tokenSymbol}</h3>
              {score >= 80 && (
                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  VERIFIED
                </span>
              )}
            </div>
            <p className="text-xs text-white/50 truncate">{token.tokenName}</p>
            <button className="flex items-center gap-1 mt-1 text-[10px] text-white/30 hover:text-white/60 transition-colors">
              <span className="font-mono">{token.tokenAddress.slice(0, 8)}...{token.tokenAddress.slice(-6)}</span>
              <Copy className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Price Section */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold font-mono text-white tabular-nums">
            {fmtPrice(token.usdPrice)}
          </span>
          <div className={cn(
            "flex items-center gap-1 text-sm font-medium",
            isPositive ? "text-emerald-400" : "text-red-400"
          )}>
            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span className="font-mono tabular-nums">{fmtPct(change)}</span>
          </div>
        </div>
        <p className="text-[10px] text-white/30 mt-1">{timeframe.toUpperCase()} Change</p>
      </div>

      {/* Chart */}
      <div className="p-4 border-b border-white/5">
        <AreaChart positive={isPositive} />
      </div>

      {/* Stats Grid */}
      <div className="p-4 grid grid-cols-2 gap-3 border-b border-white/5">
        <div className="bg-white/5 rounded-lg p-3">
          <div className="flex items-center gap-2 text-white/40 text-[10px] mb-1">
            <Activity className="w-3 h-3" />
            <span>VOLUME ({timeframe})</span>
          </div>
          <span className="text-sm font-mono font-medium text-white">
            {volume ? `$${formatBalanceWithScale(volume)}` : "—"}
          </span>
        </div>
        <div className="bg-white/5 rounded-lg p-3">
          <div className="flex items-center gap-2 text-white/40 text-[10px] mb-1">
            <Droplets className="w-3 h-3" />
            <span>LIQUIDITY</span>
          </div>
          <span className="text-sm font-mono font-medium text-white">
            {token.totalLiquidityUsd ? `$${formatBalanceWithScale(token.totalLiquidityUsd)}` : "—"}
          </span>
        </div>
        <div className="bg-white/5 rounded-lg p-3">
          <div className="flex items-center gap-2 text-white/40 text-[10px] mb-1">
            <Users className="w-3 h-3" />
            <span>HOLDERS</span>
          </div>
          <span className="text-sm font-mono font-medium text-white">
            {token.totalHolders ? formatBalanceWithScale(token.totalHolders) : "—"}
          </span>
        </div>
        <div className="bg-white/5 rounded-lg p-3">
          <div className="flex items-center gap-2 text-white/40 text-[10px] mb-1">
            <Shield className="w-3 h-3" />
            <span>SECURITY</span>
          </div>
          <span className={cn(
            "text-sm font-mono font-medium",
            score >= 80 ? "text-emerald-400" : score >= 50 ? "text-yellow-400" : "text-red-400"
          )}>
            {score || "—"}/100
          </span>
        </div>
      </div>

      {/* Market Cap */}
      <div className="p-4 border-b border-white/5">
        <div className="text-[10px] text-white/40 mb-1">MARKET CAP</div>
        <span className="text-lg font-mono font-medium text-white">
          {token.marketCap ? `$${formatBalanceWithScale(token.marketCap)}` : "—"}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="p-4 mt-auto space-y-2">
        <button className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold text-sm hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-lg shadow-emerald-500/20">
          Trade {token.tokenSymbol}
        </button>
        <button className="w-full py-2.5 rounded-xl bg-white/5 text-white/70 font-medium text-sm hover:bg-white/10 transition-all flex items-center justify-center gap-2">
          <ExternalLink className="w-4 h-4" />
          View on Explorer
        </button>
      </div>
    </div>
  );
}
