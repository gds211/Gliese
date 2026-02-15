import { useState } from "react";

const categories = ["Trending", "Top Traded", "New Pairs", "Stablecoins", "Memes"];
const timeRanges = ["5m", "1h", "6h", "24h"];

export default function ExploreFilters() {
  const [activeCategory, setActiveCategory] = useState("Trending");
  const [activeTime, setActiveTime] = useState("24h");

  return (
    <div className="flex items-center justify-between pb-5 mb-5 gap-3 flex-wrap border-b border-white/[0.06]">
      <div className="flex items-center gap-6">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setActiveCategory(c)}
            className={`relative pb-2 text-sm font-medium tracking-wide transition-colors ${
              activeCategory === c
                ? "text-white"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            {c}
            {activeCategory === c && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-orange-500 rounded-full" />
            )}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1 rounded-lg p-0.5 border border-white/[0.06]">
        {timeRanges.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTime(t)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium tracking-wide transition-colors ${
              activeTime === t
                ? "bg-white/[0.08] text-white"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
