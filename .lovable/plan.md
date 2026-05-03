## Changes to `src/components/PoolsInterface.tsx` (Add Liquidity view)

### 1. Halve the Add Liquidity panel width and right-align it

Keep Pool Composition full-width (unchanged). Wrap only the Add Liquidity panel in a right-aligning flex row and set its width to 50% of the container:

```
<div className="flex justify-end">
  <div className="w-1/2 rounded-2xl border border-white/10 p-6" style={{ backgroundColor: "#262626" }}>
    ... existing Add Liquidity contents unchanged ...
  </div>
</div>
```

This makes Add Liquidity half its current width and aligns its right edge with the right edge of Pool Composition. Pool Composition stays in place above it.

### 2. Add a circular `+` icon between the two token inputs

Between the Token A input card and the Token B input card, insert a centered overlay plus button matching the reference screenshot:

```
<div className="relative flex justify-center -my-2 z-10">
  <div className="w-8 h-8 rounded-full bg-primary/20 border-4 border-[#262626] flex items-center justify-center">
    <Plus className="w-4 h-4 text-primary" />
  </div>
</div>
```

- `Plus` is already imported from `lucide-react`.
- `border-[#262626]` matches the panel background so the circle visually punches through the gap.
- Reduce the bottom margins on the two input cards (e.g. `mb-3` → `mb-0`, `mb-5` → `mb-5` kept) so the plus sits cleanly between them.

### Files
- `src/components/PoolsInterface.tsx` — only file edited.
