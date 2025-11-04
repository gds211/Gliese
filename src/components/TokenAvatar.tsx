import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { imageCache } from "@/lib/imageCache";

// Eagerly import *local* token logos once at build time.
const modules = import.meta.glob("../assets/tokens/*.{svg,png,webp}", {
  eager: true,
}) as Record<string, { default: string }>;

const byBase: Record<string, string> = {};
for (const [path, mod] of Object.entries(modules)) {
  const file = path.split("/").pop()!;
  const base = file.replace(/\.(svg|png|webp)$/i, "").toLowerCase();
  byBase[base] = mod.default;
}

type Props = {
  symbol?: string;
  address?: `0x${string}` | string;
  logoURI?: string;
  size?: number;
  className?: string;
  rounded?: boolean;
  title?: string;
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
  // Check if external logo previously failed
  const skipExternal = logoURI && imageCache.hasFailed(logoURI);

  // Find local asset
  const candidates: string[] = [];
  if (address) candidates.push(String(address).toLowerCase());
  if (symbol) candidates.push(String(symbol).toLowerCase());

  let localSrc: string | undefined;
  for (const key of candidates) {
    if (byBase[key]) {
      localSrc = byBase[key];
      break;
    }
  }

  // Fallback letter
  const letter = (symbol || (address ? String(address).slice(2, 3) : "?"))
    .slice(0, 1)
    .toUpperCase();

  return (
    <Avatar
      style={{ width: size, height: size }}
      className={`${rounded ? "rounded-full" : ""} ${className}`}
      title={title}
    >
      {/* 1. Try local asset FIRST (instant) */}
      {localSrc && <AvatarImage src={localSrc} alt={symbol || "token"} />}

      {/* 2. Try external logo only if no local asset (and not previously failed) */}
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
