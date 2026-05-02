In `src/components/PoolsInterface.tsx`, in the Add Liquidity view (when `selectedPool` is truthy):

1. Remove the standalone `< Back` button block that currently sits above the title with `mb-6`.
2. Restructure the title row so the Back button sits on the LEFT, immediately followed by the token pair icons, pair name (e.g. "USDC/USDT"), and spread badge — all on the same horizontal line.
   - Wrap them in a single `flex items-center gap-3` row.
   - Back button: `<button onClick={closeAdd} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mr-2">` with `<ChevronLeft />` + "Back".
3. Move this combined row UP by reducing the top padding of the scroll container from `pt-8` to `pt-4` (and reduce the row's `mb-6` to `mb-4`), so the title aligns vertically near where the old Back button used to start.

No other changes.