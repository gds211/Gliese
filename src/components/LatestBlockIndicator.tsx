// src/components/LatestBlockIndicator.tsx
import { useLatestBlock } from "@/hooks/useLatestBlock";

type Size = "xs" | "sm" | "md";

const SIZES: Record<Size, { outer: string; inner: string; text: string; gap: string }> = {
  // Ultra-compact: outer 10px, inner 6px, ~11px text, tight gap
  xs: { outer: "h-2.5 w-2.5", inner: "h-1.5 w-1.5", text: "text-[11px] sm:text-xs", gap: "gap-1.5" },
  // Small
  sm: { outer: "h-3 w-3", inner: "h-2 w-2", text: "text-xs sm:text-sm", gap: "gap-2" },
  // Medium
  md: { outer: "h-3.5 w-3.5", inner: "h-2.5 w-2.5", text: "text-sm", gap: "gap-2" },
};

type Props = {
  className?: string;
  pollingMs?: number; // default 10_000
  label?: string;     // optional "Block"
  size?: Size;        // default "xs"
};

export default function LatestBlockIndicator({
  className = "",
  pollingMs = 10_000,
  label,
  size = "xs",
}: Props) {
  const { blockNumber, error } = useLatestBlock(pollingMs);
  const s = SIZES[size];
  const isError = Boolean(error);

  // Outer: dark circle; border goes reddish on error
  const outerClasses = [
    "inline-flex items-center justify-center rounded-full bg-black/70",
    isError ? "border border-red-400/70" : "border border-white/20",
    s.outer,
  ].join(" ");

  // Inner:
  // - OK: white + pulsing
  // - Error: solid red, no pulse
  const innerClasses = [
    "rounded-full",
    s.inner,
    isError ? "bg-red-500" : "bg-white pulse-white",
  ].join(" ");

  return (
    <div
      className={`flex items-center ${s.gap} ${s.text} text-foreground/80 leading-[1] ${className}`}
      title={isError ? error ?? "RPC error" : undefined}
      aria-live="polite"
    >
      <span className={outerClasses} aria-label={isError ? "latest-block-error" : "latest-block-ok"}>
        <span className={innerClasses} />
      </span>

      {label ? <span className="text-foreground/60">{label}</span> : null}

      <span className="tabular-nums leading-none">
        {blockNumber !== null ? blockNumber.toString() : "—"}
      </span>
    </div>
  );
}
