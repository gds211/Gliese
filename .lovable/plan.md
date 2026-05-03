## Add a Stats panel next to Add Liquidity

In `src/components/PoolsInterface.tsx`, in the Add view (when `selectedPool` is set), replace the current `<div className="flex justify-end">` wrapper around the Add Liquidity card with a two-column row that hosts a new Stats panel on the left and the existing Add Liquidity card on the right.

### Layout
- Container: `flex gap-4 items-start`
- Stats panel: `w-[40%]` (narrower)
- Add Liquidity panel: keep existing `w-[60%]` (wider, no longer wrapped in `justify-end`)
- Both share the same card styling: `rounded-2xl border border-white/10 p-6` with `backgroundColor: "#262626"` to match Pool Composition / Add Liquidity.

### Stats panel content (matches uploaded screenshot)
Three stacked metrics, each as label + large value + optional change indicator:

1. `TVL` → `$133.6M` with green `▲ 0.15%`
2. `24H volume` → `$23.2K` with green `▲ 391.01%`
3. `24H fees` → `$69.49` (no change indicator)

Markup pattern per metric:
```
<div>
  <div className="text-sm text-muted-foreground mb-1">TVL</div>
  <div className="flex items-baseline gap-2">
    <span className="text-3xl text-foreground">$133.6M</span>
    <span className="text-xs text-emerald-400 flex items-center gap-0.5">
      <ArrowUp className="w-3 h-3" />0.15%
    </span>
  </div>
</div>
```

Stack the three blocks with `space-y-5`. Title `Stats` at top using the same `text-base text-foreground mb-4` style as `Pool Composition` / `Add Liquidity`.

`ArrowUp` is already imported from `lucide-react`.

### Values
Use the placeholder values from the screenshot ($133.6M / $23.2K / $69.49). They will not be wired to live pool data — purely visual to match the reference, consistent with how Pool Composition uses static `57.1 / 42.9` ratios.

### Files
- `src/components/PoolsInterface.tsx` — only file edited.
