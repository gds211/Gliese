In `src/components/PoolsInterface.tsx` (Add Liquidity view):

1. Remove the standalone `Back` button block (currently sits above the title with `mb-6`).
2. Restructure the title row so Back sits on the left, followed by the token icons, pair name, and spread badge:
   ```
   [< Back]  [icons]  USDC/USDT  [0.01%]
   ```
   - Wrap in a single flex row with `items-center gap-3`.
   - Back button keeps its onClick (`closeAdd`), `ChevronLeft` icon, muted-foreground styling, and gets `mr-2` or rely on gap.
3. Reduce top spacing so the title sits a bit higher: change container padding from `pt-8` to `pt-4` (and reduce title row `mb-6` to `mb-4`) so the USDC/USDT row and icons move up.

No other changes.