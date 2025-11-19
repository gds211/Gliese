// src/components/TokenAvatar.tsx
import React, { useMemo, useState } from "react"

/**
 * TokenAvatar
 * - Prefers LOCAL assets first (by address or symbol) to avoid remote repaint/flicker
 * - Falls back to remote `logoURI` if no local asset is available
 * - If remote fails to load -> letter badge fallback
 * - Keeps the chosen src stable for the life of a token (address/symbol) to prevent src ping‑pong
 *
 * Place local files in: src/assets/tokens/  (e.g., usdc.svg, usdc.png, 0xabc...png)
 */

// Eagerly import local token logos at build time (Vite)
const modules = import.meta.glob("../assets/tokens/*.{svg,png,webp}", {
  eager: true,
}) as Record<string, { default: string }>

const byBase: Record<string, string> = {}
for (const [path, mod] of Object.entries(modules)) {
  const file = path.split("/").pop()! // e.g. usdc.svg
  const base = file.replace(/\.(svg|png|webp)$/i, "").toLowerCase()
  // On some bundlers the module is the string itself; on Vite it's { default: url }
  // @ts-ignore
  byBase[base] = (mod?.default ?? (mod as any)) as string
}

type Props = {
  symbol?: string
  address?: `0x${string}` | string
  title?: string
  size?: number
  className?: string
  rounded?: boolean
  logoURI?: string
  /** Set to true for the primary, on-screen selected tokens to decode sooner */
  eager?: boolean
}

export default function TokenAvatar({
  symbol,
  address,
  title,
  size = 20,
  className = "",
  rounded = true,
  logoURI,
  eager = false,
}: Props) {
  // Normalize candidates once for stable lookup
  const candidates = useMemo(() => {
    const out: string[] = []
    if (address) out.push(String(address).toLowerCase())
    if (symbol) out.push(String(symbol).toLowerCase())
    return out
  }, [address, symbol])

  const localSrc = useMemo(() => {
    for (const key of candidates) {
      if (byBase[key]) return byBase[key]
    }
    return undefined
  }, [candidates])

  const [externalFailed, setExternalFailed] = useState(false)

  // Choose a final src ONCE per token identity (address/symbol)
  // Prefer local (no network), then remote logoURI if available and not failed.
  const finalSrc = localSrc ?? (!externalFailed && logoURI ? logoURI : undefined)

  if (finalSrc) {
    const isRemote = finalSrc === logoURI && !!logoURI
    return (
      <img
        src={finalSrc}
        alt={symbol || (address as string) || "token"}
        width={size}
        height={size}
        title={title}
        className={`block object-cover ${rounded ? "rounded-full" : ""} ${className}`}
        draggable={false}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        onError={isRemote ? () => setExternalFailed(true) : undefined}
      />
    )
  }

  // Fallback: single letter badge
  const letter = (symbol || (address ? String(address).slice(2, 3) : "?"))
    .slice(0, 1)
    .toUpperCase()

  return (
    <div
      style={{ width: size, height: size }}
      className={`grid place-items-center ${rounded ? "rounded-full" : ""} bg-white/15 text-[10px] font-semibold uppercase ${className}`}
      title={`${title || symbol || address || "token"} (no icon)`}
      aria-label={`${symbol || address || "token"} (no icon)`}
    >
      {letter}
    </div>
  )
}
