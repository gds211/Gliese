// src/components/TokenAvatar.tsx
import React from "react";

// Load local token logos at build time
const modules = import.meta.glob("../assets/tokens/*.{svg,png,webp}", {
  eager: true,
}) as Record<string, { default: string }>;

const byBase: Record<string, string> = {};
for (const [path, mod] of Object.entries(modules)) {
  const file = path.split("/").pop()!; // e.g., "usdc.svg"
  const base = file.replace(/\.(svg|png|webp)$/i, "").toLowerCase();
  byBase[base] = mod.default;
}

type Props = {
  symbol?: string;
  address?: string;
  size?: number;        // pixels
  rounded?: boolean;
  className?: string;
  title?: string;
};

export default function TokenAvatar({
  symbol,
  address,
  size = 20,           // bump default to 20px (better for thin-ring logos)
  rounded = true,
  className = "",
  title,
}: Props) {
  const candidates: string[] = [];
  if (symbol) candidates.push(String(symbol).toLowerCase());
  if (address) candidates.push(String(address).toLowerCase());

  let src: string | undefined;
  for (const key of candidates) {
    if (byBase[key]) {
      src = byBase[key];
      break;
    }
  }

  const s = Math.round(size); // ensure integer pixels

  if (src) {
    return (
      <img
        src={src}
        width={s}
        height={s}
        alt={title || symbol || address || "token"}
        draggable={false}
        decoding="async"
        loading="eager"
        // Block-level + crisp rendering prevents subpixel softening
        className={`${rounded ? "rounded-full" : ""} block shrink-0 ${className}`}
        style={{
          imageRendering: "crisp-edges",
          // Avoid any accidental scaling from fonts/line-height
          display: "block",
        }}
      />
    );
  }

  // Fallback: letter badge
  const letter = (symbol || address || "?").slice(0, 1).toUpperCase();
  return (
    <div
      style={{ width: s, height: s }}
      className={`grid place-items-center ${rounded ? "rounded-full" : ""} bg-white/15 text-[10px] font-semibold uppercase ${className}`}
      title={`${title || symbol || address || "token"} (no icon)`}
      aria-label={`${symbol || address || "token"} (no icon)`}
    >
      {letter}
    </div>
  );
}
