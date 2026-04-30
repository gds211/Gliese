## Pools interface: stable row numbers, default TVL sort, header casing

All changes scoped to `src/components/PoolsInterface.tsx`.

### 1. Stable `#` column

Currently the `#` cell renders `pool.id`, which is tied to the pool itself, so on a sort the IDs reorder along with the rows. Change it to render the row's position in the displayed list (1-based index from the `sorted.map((pool, idx) => ...)` callback). The numbers will then always read 1, 2, 3, … top to bottom regardless of sort.

### 2. Default sort = TVL descending

Change initial state:
- `sortKey` initial value from `null` → `"tvl"`
- `sortDir` stays `"desc"`

Because `SortHeader` already renders the orange text + down arrow when `sortKey === "tvl"` and `sortDir === "desc"`, the TVL header will show as the active column on first render, and the table will load sorted by TVL descending.

### 3. Header label casing

In the table header row:
- `<div>Spread</div>` instead of relying on the `uppercase` class to display "SPREAD". The container has `text-xs uppercase tracking-wider` applied to the whole header row, which is what's forcing all caps. Remove the `uppercase` class from that wrapper so the literal text casing wins for every header (Pool, Spread, TVL, Volume 24H, Fees 24H, APR 24H, #).
- The existing strings in the JSX are already `Pool`, `Spread`, `TVL`, etc., so once `uppercase` is removed they render with the desired casing. `tracking-wider` and `text-xs` remain for the same compact header look.

### Files modified
- `src/components/PoolsInterface.tsx`
