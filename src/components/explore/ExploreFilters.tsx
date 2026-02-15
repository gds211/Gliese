import { useState } from "react";

const categories = ["Trending", "Top Traded", "New Pairs", "Stablecoins", "Memes"];
const timeRanges = ["5m", "1h", "6h", "24h"];

export default function ExploreFilters() {
  const [activeCategory, setActiveCategory] = useState("Trending");
  const [activeTime, setActiveTime] = useState("24h");

  return (
    <div className="flex items-center justify-between px-4 py-3 gap-3 flex-wrap">
      <div className="flex items-center gap-2 flex-wrap">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setActiveCategory(c)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeCategory === c
                ? "bg-white/20 text-white"
                : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1 bg-white/5 rounded-full p-0.5">
        {timeRanges.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTime(t)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              activeTime === t
                ? "bg-white/20 text-white"
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
