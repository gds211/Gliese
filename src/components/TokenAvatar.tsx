import React, { useState } from "react";


// Eagerly import *local* token logos once at build time.
// Put files in: src/assets/tokens/  (e.g., mon.svg, usdc.svg, 0xabc....png)
const modules = import.meta.glob("../assets/tokens/*.{svg,png,webp}", {
  eager: true,
}) as Record<string, { default: string }>;

const byBase: Record<string, string> = {};
for (const [path, mod] of Object.entries(modules)) {
  const file = path.split("/").pop()!;                           // e.g. usdc.svg
  const base = file.replace(/\.(svg|png|webp)$/i, "").toLowerCase();
  byBase[base] = mod.default;
}

type Props = {
  symbol?: string;
  address?: `0x${string}` | string;
  logoURI?: string;     // NEW: external icon URL
  size?: number;        // px
  className?: string;
  rounded?: boolean;    // default circle
  title?: string;       // optional tooltip text
};


export default function TokenAvatar({
  symbol,
  address,
  logoURI,              // NEW
  size = 18,
  className = "",
  rounded = true,
  title,
}: Props) {
  const [externalFailed, setExternalFailed] = useState(false);

  // 1) External logo (highest priority)
  if (logoURI && !externalFailed) {
    return (
      <img
  src={logoURI}
  alt={symbol || (address as string) || "token"}
  width={size}
  height={size}
  title={title}
  decoding="async"
  loading="lazy"
  referrerPolicy="no-referrer"
  className={`${rounded ? "rounded-full" : ""} ${className}`}
  draggable={false}
  onError={() => setExternalFailed(true)}
/>

    );
  }

  // 2) Local logos (by address or symbol)
  const candidates: string[] = [];
  // Prioritize address first since most icons are named by address

  if (address) candidates.push(String(address).toLowerCase());
  if (symbol) candidates.push(String(symbol).toLowerCase());

  let src: string | undefined;
  for (const key of candidates) {
    if (byBase[key]) {
      src = byBase[key];
      break;
    }
  }

  if (src) {
    return (
      <img
        src={src}
        alt={symbol || (address as string) || "token"}
        width={size}
        height={size}
        title={title}
        decoding="async"
        loading="lazy"
        className={`${rounded ? "rounded-full" : ""} ${className}`}
        draggable={false}
      />
    );
  }

  // Fallback: letter badge
  const letter = (symbol || (address ? String(address).slice(2, 3) : "?"))
    .slice(0, 1)
    .toUpperCase();

  return (
    <div
      style={{ width: size, height: size }}
      className={`grid place-items-center ${rounded ? "rounded-full" : ""} bg-white/15 text-[10px] font-semibold uppercase ${className}`}
      title={`${title || symbol || address || "token"} (no icon)`}
      aria-label={`${symbol || address || "token"} (no icon)`}
    >
      {letter}
    </div>
  );
}
