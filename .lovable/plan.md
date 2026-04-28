## Two-tone Background for Pools Table

Edit `src/components/PoolsInterface.tsx`:

1. **Outer table card** — replace `bg-background` with inline `style={{ backgroundColor: "#131313" }}` on the card container. This becomes the background for the body/rows area.

2. **Tabs strip** (`All Pools` / `My Positions` row) — add inline `style={{ backgroundColor: "#1A1A1A" }}`.

3. **Column header row** (`# / Pool / Spread / TVL / Volume 24H / Fees 24H / APR 24H`) — add inline `style={{ backgroundColor: "#1A1A1A" }}`.

No structural, column, or text changes.