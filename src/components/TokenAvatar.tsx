import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { imageCache } from "@/lib/imageCache";

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
  logoURI?: string;     // external icon URL
  size?: number;        // px
  className?: string;
  rounded?: boolean;    // default circle
  title?: string;       // optional tooltip text
};

export default function TokenAvatar({
  symbol,
  address,
  logoURI,
  size = 18,
  className = "",
  rounded = true,
  title,
}: Props) {
  const skipExternal = logoURI && imageCache.hasFailed(logoURI);

  // Find local asset (by address or symbol)
  const candidates: string[] = [];
  // Prioritize address first since most icons are named by address
  if (address) candidates.push(String(address).toLowerCase());
  if (symbol) candidates.push(String(symbol).toLowerCase());

  let localSrc: string | undefined;
  for (const key of candidates) {
    if (byBase[key]) {
      localSrc = byBase[key];
      break;
    }
  }

  // Fallback: letter badge
  const letter = (symbol || (address ? String(address).slice(2, 3) : "?"))
    .slice(0, 1)
    .toUpperCase();

  return (
    <Avatar
      style={{ width: size, height: size }}
      className={`${rounded ? "rounded-full" : ""} ${className}`}
      title={title}
    >
      {/* 1. Local asset FIRST (instant) */}
      {localSrc && <AvatarImage src={localSrc} alt={symbol || "token"} />}

      {/* 2. External logo only if no local asset exists (and not previously failed) */}
      {!localSrc && logoURI && !skipExternal && (
        <AvatarImage
          src={logoURI}
          alt={symbol || "token"}
          onError={() => imageCache.markFailed(logoURI)}
        />
      )}

      {/* 3. Letter badge fallback */}
      <AvatarFallback className="bg-white/15 text-[10px] font-semibold uppercase">
        {letter}
      </AvatarFallback>
    </Avatar>
  );
}
