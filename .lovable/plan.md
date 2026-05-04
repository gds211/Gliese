## Pool Composition — white labels + tighter segment gap

In `src/components/PoolsInterface.tsx` (around lines 140–151):

1. **Remove black text outline on labels** so the percentages render as plain white.
   - Drop `WebkitTextStroke: "0.5px black"` from the inline `style` of both segment label divs (USDC and USDT). Keep `width: ${ratio}%`.
   - Labels already use `text-white`, so no className change needed.

2. **Reduce gap between the two segments by ~33%.**
   - Change the segments wrapper from `gap-1.5` (6px) to `gap-1` (4px).
   - `<div className="flex w-full h-10 gap-1.5">` → `<div className="flex w-full h-10 gap-1">`

No other styling, layout, colors, or sizes change.

### Files
- `src/components/PoolsInterface.tsx`
