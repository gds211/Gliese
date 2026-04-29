## Pools Interface — Inter Medium 500 + APR color fix

Edit `src/components/PoolsInterface.tsx`:

1. **Font: Inter Medium 500 across the entire Pools section**
   - On the outermost wrapper `<div>` of `PoolsInterface`, add inline `style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}`. This cascades to header, search input, tabs, table header, and all rows.
   - Remove `font-bold` / `font-semibold` Tailwind classes that would override 500 weight on:
     - The `Liquidity Pools` heading (`font-bold` → drop)
     - Tabs buttons (`font-semibold` → drop)
     - Table header row (`font-semibold` → drop)
     - Pool pair name, category, TVL, Volume, Fees, APR cells (`font-semibold` → drop)
     - The "New Pool" button and per-row "Add" button (`font-semibold` → drop)
   - The `font-medium` class on the spread badge stays (already 500).

2. **Index.html — load Inter weight 500**
   - Update the Google Fonts `<link>` to include `wght@500` (currently only `600`):
     `family=Inter:wght@500;600&display=swap`

3. **APR 24H column → white**
   - Change `text-emerald-400` on the APR cell to `text-foreground` (white).

No structural, layout, or background changes. Backgrounds (`#131313` body, `#1A1A1A` header strips) remain as-is.

### Files modified
- `src/components/PoolsInterface.tsx`
- `index.html`
