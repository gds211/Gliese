import React from "react";
import SlippagePng from "@/assets/slippage.png";

type Props = {
  /** Pass your dynamic slippage as a percentage, e.g. 0.1 for 0.1% */
  slippagePct?: number | null;
  /** Optional: pass the exact Tailwind color classes used by your “Buying” text (e.g., "text-emerald-500") */
  className?: string;
  /** Optional tooltip */
  title?: string;
  /** Rounding mode: "round" (default) or "floor" if you prefer truncation */
  mode?: "round" | "floor";
};

export default function SlippageIndicator({
  slippagePct,
  className = "",
  title = "Dynamic slippage",
  mode = "round",
}: Props) {
  const norm =
    typeof slippagePct === "number" && isFinite(slippagePct) ? Math.max(slippagePct, 0) : null;

  const oneDecimal = React.useMemo(() => {
    if (norm === null) return null;
    const x = mode === "floor" ? Math.floor(norm * 10) / 10 : Math.round(norm * 10) / 10;
    return x.toFixed(1); // always show exactly one decimal
  }, [norm, mode]);

  return (
    <div
      className={`flex items-center gap-1.5 select-none ${className}`}
      title={title}
      aria-label="Dynamic slippage indicator"
    >
      <img src={SlippagePng} alt="Slippage" className="w-4 h-4 shrink-0" />
      <span className="text-xs leading-none tabular-nums">
        {oneDecimal !== null ? `${oneDecimal}%` : "—"}
      </span>
    </div>
  );
}

