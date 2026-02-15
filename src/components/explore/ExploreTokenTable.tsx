import { Plus } from "lucide-react";
import SparklineChart from "./SparklineChart";

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const sparkline = (up: boolean) =>
  Array.from({ length: 12 }, (_, i) => (up ? 20 + i * 2 + rand(-3, 3) : 40 - i * 1.5 + rand(-3, 3)));

type Token = {
  name: string;
  ticker: string;
  age: string;
  verified: boolean;
  price: string;
  change: number;
  mc: string;
  fdv: string;
  vol24: string;
  netVol: string;
  liquidity: string;
  holders: string;
  holdersChange: number;
  feesPaid: string;
  spark: number[];
};

const tokens: Token[] = [
  { name: "Pippin", ticker: "PIP", age: "3d", verified: true, price: "$0.0042", change: 12.5, mc: "$4.2M", fdv: "$8.1M", vol24: "$1.8M", netVol: "+$420K", liquidity: "$890K", holders: "2,841", holdersChange: 8.2, feesPaid: "14.2 MON", spark: sparkline(true) },
  { name: "Molandak", ticker: "DAK", age: "12h", verified: true, price: "$0.087", change: -5.3, mc: "$12M", fdv: "$18M", vol24: "$3.2M", netVol: "-$180K", liquidity: "$2.1M", holders: "5,120", holdersChange: -1.4, feesPaid: "32.5 MON", spark: sparkline(false) },
  { name: "Chog", ticker: "CHOG", age: "2d", verified: true, price: "$0.0015", change: 45.8, mc: "$1.5M", fdv: "$3M", vol24: "$980K", netVol: "+$320K", liquidity: "$410K", holders: "1,203", holdersChange: 22.1, feesPaid: "8.7 MON", spark: sparkline(true) },
  { name: "Moyaki", ticker: "YAKI", age: "5d", verified: false, price: "$0.023", change: -12.1, mc: "$6.8M", fdv: "$10M", vol24: "$1.1M", netVol: "-$95K", liquidity: "$1.4M", holders: "3,450", holdersChange: -3.2, feesPaid: "18.9 MON", spark: sparkline(false) },
  { name: "PUMP", ticker: "PUMP", age: "1h", verified: false, price: "$0.00008", change: 156.2, mc: "$320K", fdv: "$800K", vol24: "$540K", netVol: "+$210K", liquidity: "$78K", holders: "412", holdersChange: 85.0, feesPaid: "3.1 MON", spark: sparkline(true) },
  { name: "Naruto Inu", ticker: "NARU", age: "8h", verified: false, price: "$0.0001", change: -28.4, mc: "$180K", fdv: "$500K", vol24: "$290K", netVol: "-$110K", liquidity: "$42K", holders: "289", holdersChange: -5.6, feesPaid: "1.8 MON", spark: sparkline(false) },
  { name: "MonadPepe", ticker: "MPEPE", age: "1d", verified: true, price: "$0.0067", change: 8.9, mc: "$8.4M", fdv: "$12M", vol24: "$2.5M", netVol: "+$560K", liquidity: "$1.8M", holders: "4,100", holdersChange: 4.5, feesPaid: "24.3 MON", spark: sparkline(true) },
  { name: "GlowCat", ticker: "GLOW", age: "4d", verified: false, price: "$0.011", change: -1.2, mc: "$3.1M", fdv: "$5M", vol24: "$620K", netVol: "-$30K", liquidity: "$680K", holders: "1,890", holdersChange: 0.8, feesPaid: "7.4 MON", spark: sparkline(false) },
  { name: "Based Monk", ticker: "MONK", age: "6h", verified: true, price: "$0.032", change: 34.7, mc: "$15M", fdv: "$22M", vol24: "$4.8M", netVol: "+$1.2M", liquidity: "$3.4M", holders: "6,200", holdersChange: 12.3, feesPaid: "41.6 MON", spark: sparkline(true) },
  { name: "Useless", ticker: "ULESS", age: "2h", verified: false, price: "$0.000002", change: -62.1, mc: "$18K", fdv: "$100K", vol24: "$45K", netVol: "-$28K", liquidity: "$5.2K", holders: "98", holdersChange: -15.0, feesPaid: "0.4 MON", spark: sparkline(false) },
];

export default function ExploreTokenTable() {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-[#080D15]">
          <tr className="border-b border-slate-700/40">
            <th className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">#</th>
            <th className="text-left py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Token</th>
            <th className="text-right py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Price</th>
            <th className="text-right py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">MC / FDV</th>
            <th className="text-right py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">24h Vol</th>
            <th className="text-right py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Liquidity</th>
            <th className="text-right py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Holders</th>
            <th className="text-right py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Fees Paid</th>
            <th className="text-center py-3 px-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Last 24h</th>
            <th className="py-3 px-3"></th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((t, i) => (
             <tr key={t.ticker} className="border-b border-slate-700/20 last:border-b-0 hover:bg-slate-800/30 transition-colors">
              <td className="py-5 px-4 text-slate-500 text-xs tabular-nums">{i + 1}</td>
              <td className="py-5 px-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-700/60 flex items-center justify-center text-[11px] font-bold text-slate-300 shrink-0 border border-slate-600/30">
                    {t.ticker.slice(0, 2)}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="text-white font-medium">{t.name}</span>
                      {t.verified && (
                        <svg width="13" height="13" viewBox="0 0 22 22" className="shrink-0">
                          <path
                            d="M12.096 1.673c-.593-.635-1.599-.635-2.192 0L8.452 3.227c-.296.316-.714.49-1.147.474L5.18 3.63c-.867-.03-1.579.682-1.55 1.55l.072 2.125c.015.433-.158.851-.474 1.147L1.673 9.904c-.635.593-.635 1.599 0 2.192l1.554 1.452c.316.296.49.714.474 1.147L3.63 16.82c-.03.867.682 1.579 1.55 1.55l2.125-.072c.433-.015.851.158 1.147.474l1.452 1.555c.593.634 1.599.634 2.192 0l1.452-1.555c.296-.316.714-.49 1.147-.474l2.126.071c.867.03 1.579-.682 1.55-1.55l-.072-2.125c-.015-.433.158-.851.474-1.147l1.555-1.452c.634-.593.634-1.599 0-2.192l-1.555-1.452c-.316-.296-.49-.714-.474-1.147l.071-2.126c.03-.867-.682-1.579-1.55-1.55l-2.125.072c-.433.015-.851-.158-1.147-.474l-1.452-1.554zM6 11.39l3.74 3.74 6.2-6.77L14.47 7l-4.8 5.23-2.26-2.26L6 11.39z"
                            fill="#F97316"
                          />
                        </svg>
                      )}
                    </div>
                    <span className="text-slate-400 text-xs">{t.ticker} · {t.age}</span>
                  </div>
                </div>
              </td>
              <td className="py-5 px-4 text-right">
                <div className="flex flex-col items-end">
                  <span className="text-white font-medium tabular-nums">{t.price}</span>
                  <span className={`text-xs tabular-nums ${t.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {t.change >= 0 ? "+" : ""}{t.change}%
                  </span>
                </div>
              </td>
              <td className="py-5 px-4 text-right">
                <div className="flex flex-col items-end">
                  <span className="text-slate-200 text-sm tabular-nums">{t.mc}</span>
                  <span className="text-slate-500 text-xs tabular-nums">{t.fdv}</span>
                </div>
              </td>
              <td className="py-5 px-4 text-right">
                <div className="flex flex-col items-end">
                  <span className="text-slate-200 text-sm tabular-nums">{t.vol24}</span>
                  <span className={`text-xs tabular-nums ${t.netVol.startsWith("+") ? "text-emerald-400" : "text-rose-400"}`}>
                    {t.netVol}
                  </span>
                </div>
              </td>
              <td className="py-5 px-4 text-right text-slate-200 text-sm tabular-nums">{t.liquidity}</td>
              <td className="py-5 px-4 text-right">
                <div className="flex flex-col items-end">
                  <span className="text-slate-200 text-sm tabular-nums">{t.holders}</span>
                  <span className={`text-xs tabular-nums ${t.holdersChange >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {t.holdersChange >= 0 ? "+" : ""}{t.holdersChange}%
                  </span>
                </div>
              </td>
              <td className="py-5 px-4 text-right text-amber-400 text-sm font-medium tabular-nums">{t.feesPaid}</td>
              <td className="py-5 px-3 flex items-center justify-center">
                <SparklineChart data={t.spark} positive={t.change >= 0} />
              </td>
              <td className="py-5 px-3">
                <button className="w-7 h-7 rounded-full bg-slate-700/50 hover:bg-slate-600/60 flex items-center justify-center transition-colors border border-slate-600/30">
                  <Plus className="w-3.5 h-3.5 text-white/70" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
