## Pools interface: search icon + sortable columns

All changes scoped to `src/components/PoolsInterface.tsx`.

### 1. Make the magnifying glass visible in "Search pools..."

The `Search` icon is currently rendered but sits behind the input because the input has no transparent background and the icon's `text-white/50` blends with the dark glass. Two fixes:

- Bump icon contrast: change `text-white/50` to `text-muted-foreground` (matches the rest of the interface and is clearly visible on the dark glass).
- Ensure the input doesn't cover it. The current `pl-10` is correct; keep it. The icon stays absolutely positioned at `left-3`.

Result: a clearly visible magnifying glass on the left side of the search box, identical in placement to the swap modal.

### 2. Sortable columns: TVL, Volume 24H, Fees 24H, APR 24H

Replace the static `ArrowUpDown` (two-arrow) icons on these four headers with dynamic single-arrow indicators that match the screenshot reference.

**Behavior**:
- Add component state: `sortKey: 'tvl' | 'volume' | 'fees' | 'apr' | null` and `sortDir: 'asc' | 'desc'`.
- Initial state: `sortKey = null`, no sort applied (pools display in their original order).
- Clicking a header:
  - If it's not the active column → make it active, set `sortDir = 'desc'` (down arrow, decreasing order).
  - If it's already active and `desc` → toggle to `asc` (up arrow, increasing order).
  - If it's already active and `asc` → toggle back to `desc`.
- Active header: text turns `text-primary` (orange) and shows a single arrow (`ArrowDown` for desc, `ArrowUp` for asc) in orange.
- Inactive headers: text stays `text-muted-foreground`, no arrow shown at all (clean look matching the screenshot — only the active column displays an arrow).

**Sorting logic**:
- Parse the existing string values (e.g. `"$211.00M"`, `"$5.4K"`, `"9.4%"`) into numbers via a small helper that strips `$`, `%`, and expands `K`/`M`/`B` suffixes.
- Sort the `filtered` array by the parsed numeric value of the chosen field in the chosen direction.

### 3. Remove orange from "Volume 24H" default styling

Currently `Volume 24H` header has hardcoded `text-primary`. Remove it so all four headers share the same default `text-muted-foreground` styling, and orange only appears when that column is the active sort.

### Technical details

```tsx
// New state
const [sortKey, setSortKey] = useState<'tvl'|'volume'|'fees'|'apr'|null>(null);
const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc');

// Parser
const parseValue = (s: string) => {
  const cleaned = s.replace(/[$,%]/g, '');
  const m = cleaned.match(/^([\d.]+)([KMB]?)$/i);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  const mult = { K: 1e3, M: 1e6, B: 1e9, '': 1 }[m[2].toUpperCase() as 'K'|'M'|'B'|''];
  return n * mult;
};

// Click handler
const handleSort = (key) => {
  if (sortKey !== key) { setSortKey(key); setSortDir('desc'); }
  else setSortDir(d => d === 'desc' ? 'asc' : 'desc');
};

// Sorted list
const sorted = sortKey
  ? [...filtered].sort((a,b) => {
      const av = parseValue(a[sortKey]); const bv = parseValue(b[sortKey]);
      return sortDir === 'desc' ? bv - av : av - bv;
    })
  : filtered;
```

Replace each sortable header cell with a `<button>` that:
- Uses `flex items-center gap-1`
- Text is `text-primary` when `sortKey === key`, else `text-muted-foreground`
- Renders `<ArrowDown />` if active+desc, `<ArrowUp />` if active+asc, nothing otherwise
- Imports: add `ArrowUp`, `ArrowDown` from `lucide-react`; remove `ArrowUpDown` if no longer used.

### Files modified
- `src/components/PoolsInterface.tsx`
