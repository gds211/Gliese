// src/components/Explore/TokenTable.tsx
import { cn, formatBalanceWithScale } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import TokenAvatar from "@/components/TokenAvatar";
import type { ExploreToken, ExploreTimeframe } from "@/hooks/useExploreFeed";

// Helper to read Moralis' nested data
function readMetric(val: any, tf: string) {
  if (val == null) return null;
  if (typeof val === "number") return val;
  const key = tf === "15m" ? "tenMinutes" : tf === "1h" ? "oneHour" : tf === "4h" ? "fourHours" : "oneDay";
  return val[key] ?? null;
}

// Special formatter for prices (handles small decimals better than the generic util)
function fmtPrice(n: number | null) {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n < 0.000001) return `$${n.toExponential(2)}`;
  if (n < 0.01) return `$${n.toFixed(6)}`;
  if (n < 1) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}

function fmtPct(n: number | null) {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
}

export default function TokenTable({ items, timeframe, isLoading }: { 
  items?: ExploreToken[]; 
  timeframe: ExploreTimeframe; 
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
        {Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-10 w-full bg-white/5" />)}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return <div className="p-8 text-center text-white/50 text-sm">No tokens found.</div>;
  }

  return (
    <div className="w-full overflow-auto">
      <Table>
        <TableHeader className="bg-black/40">
          <TableRow className="border-white/5 hover:bg-transparent">
            <TableHead className="text-white/60 text-[11px] h-8 pl-4">Token</TableHead>
            <TableHead className="text-right text-white/60 text-[11px] h-8">Price</TableHead>
            <TableHead className="text-right text-white/60 text-[11px] h-8">Change</TableHead>
            <TableHead className="text-right text-white/60 text-[11px] h-8">Volume</TableHead>
            <TableHead className="text-right text-white/60 text-[11px] h-8">Liq</TableHead>
            <TableHead className="text-right text-white/60 text-[11px] h-8 pr-4">Score</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((t, i) => {
            const chg = readMetric(t.usdPricePercentChange, timeframe);
            const vol = readMetric(t.volumeUsd, timeframe);
            
            return (
              <TableRow key={t.tokenAddress + i} className="border-white/5 hover:bg-white/5 transition-colors group">
                <TableCell className="py-2 pl-4 font-medium text-white/90">
                  <div className="flex items-center gap-3">
                     <TokenAvatar 
                        symbol={t.tokenSymbol} 
                        address={t.tokenAddress} 
                        logoURI={t.tokenLogo} 
                        size={24} 
                     />
                     <div className="flex flex-col">
                       <span className="text-xs font-bold">{t.tokenSymbol}</span>
                       <span className="text-[10px] text-white/40">{t.tokenName}</span>
                     </div>
                  </div>
                </TableCell>
                <TableCell className="text-right py-2 text-white/80 text-xs tabular-nums">
                    {fmtPrice(t.usdPrice)}
                </TableCell>
                <TableCell className={cn("text-right py-2 text-xs tabular-nums font-medium", chg > 0 ? "text-emerald-400" : "text-rose-400")}>
                  {fmtPct(chg)}
                </TableCell>
                <TableCell className="text-right py-2 text-white/60 text-xs tabular-nums">
                    {vol ? `$${formatBalanceWithScale(vol)}` : "—"}
                </TableCell>
                <TableCell className="text-right py-2 text-white/60 text-xs tabular-nums">
                    {t.totalLiquidityUsd ? `$${formatBalanceWithScale(t.totalLiquidityUsd)}` : "—"}
                </TableCell>
                <TableCell className="text-right py-2 pr-4">
                  <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-mono", (t.securityScore || 0) > 80 ? "bg-emerald-500/20 text-emerald-300" : "bg-yellow-500/20 text-yellow-300")}>
                    {t.securityScore ?? "?"}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
