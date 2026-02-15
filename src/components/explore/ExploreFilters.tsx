import { useState } from "react";

const categories = ["Trending", "Top Traded", "New Pairs", "Stablecoins", "Memes"];
const timeRanges = ["5m", "1h", "6h", "24h"];

export default function ExploreFilters() {
  const [activeCategory, setActiveCategory] = useState("Trending");
  const [activeTime, setActiveTime] = useState("24h");

  return (
    <div className="flex items-center justify-between px-6 py-4 gap-3 flex-wrap border-b border-white/[0.04]">
      <div className="flex items-center gap-2 flex-wrap">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setActiveCategory(c)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-colors ${
              activeCategory === c
                ? "bg-orange-500/20 text-orange-400 border border-orange-500/40"
                : "bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 hover:text-slate-200 border border-transparent"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1 bg-slate-800/50 rounded-full p-0.5 border border-slate-700/30">
        {timeRanges.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTime(t)}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide transition-colors ${
              activeTime === t
                ? "bg-slate-700/60 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
