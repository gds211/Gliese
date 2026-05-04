## Pool Composition bar — segmented + restyled labels

In `src/components/PoolsInterface.tsx`, replace the current single-bar markup (lines ~140–156) inside the Pool Composition card.

### Changes

1. **Remove the dotted center divider** — delete the absolutely-positioned `border-l-2 border-dotted border-white` div entirely.

2. **Convert the bar into two disjoint segments** with a clear gap between them, matching the reference image (two pill-shaped bars touching but visually broken apart):
   - Outer wrapper: `flex w-full h-10 gap-1.5` (drop `relative`, `rounded-lg`, and `overflow-hidden` since each segment now owns its own rounding).
   - Segment A (USDC, left):
     - `width: ${ratioA}%` (minus the gap is handled automatically by flex)
     - `rounded-lg`, `bg-sky-500` (blue, matching the reference — replacing the current yellow)
     - Label inside: left-aligned, `pl-3`
   - Segment B (USDT, right):
     - `width: ${ratioB}%`
     - `rounded-lg`, `bg-emerald-400` (green, matching the reference — replacing the current sky blue)
     - Label inside: right-aligned, `pr-3`

3. **Restyle both labels** to white text with a black outline (per the screenshot):
   - `text-white text-xs font-semibold`
   - Add inline `style={{ WebkitTextStroke: "0.5px black" }}` for a crisp 1px black outline around the glyphs (works in all modern browsers, including Chromium/Safari/Firefox).

### Resulting markup (conceptual)

```text
[ Pool Composition                         Flexible Ratio ]
[██████████ 57.1% USDC ██████████]  ‹gap›  [████ 42.9% USDT ████]
```

Both segments keep the same overall bar height (`h-10`) and the labels keep the same font size, so only the divider style and segmentation change — no layout shift to surrounding panels.

### Files
- `src/components/PoolsInterface.tsx` — only file edited.
