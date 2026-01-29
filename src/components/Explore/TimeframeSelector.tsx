// src/components/Explore/TimeframeSelector.tsx
import { cn } from "@/lib/utils";
import type { ExploreTimeframe } from "@/hooks/useExploreFeed";

const OPTIONS: { label: string; value: ExploreTimeframe }[] = [
  { label: "15m", value: "15m" },
  { label: "1H", value: "1h" },
  { label: "4H", value: "4h" },
  { label: "24H", value: "24h" },
];

export default function TimeframeSelector(props: {
  value: ExploreTimeframe;
  onChange: (v: ExploreTimeframe) => void;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex items-center rounded-lg border border-white/10 bg-black/25 p-1 backdrop-blur-md", props.className)}>
      {OPTIONS.map((opt) => {
        const active = opt.value === props.value;
        return (
          <button
            key={opt.value}
            onClick={() => props.onChange(opt.value)}
            className={cn(
              "h-7 rounded-md px-2.5 text-[11px] font-medium transition-all",
              active ? "bg-white/10 text-white shadow-sm" : "text-white/60 hover:text-white hover:bg-white/5"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
