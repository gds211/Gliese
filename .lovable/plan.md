## Plan: Lock navbar in place, expand Pools list to bottom, add 4 more pools

### Problem
1. The navbar (Gliese logo + nav pill + Connect Wallet) scrolls with the page on the Pools tab instead of staying pinned to the top.
2. The "All Pools" card doesn't reach the bottom of the screen — there's a visible gap.
3. Only 6 pools exist; user wants 4 more (10 total).

### Root cause
- In `src/pages/Index.tsx`, the page root is `min-h-screen` and the `Navigation` component is just a normal in-flow `<nav>`. When `PoolsInterface` (currently `h-[calc(100vh-65px)]`) is taller than the actual remaining viewport (because the navbar is not exactly 65px tall), the page itself becomes scrollable, and the navbar scrolls away with it.
- The `h-[calc(100vh-65px)]` magic number doesn't match the real navbar height, leaving a gap at the bottom (or causing overflow).

### Fix

**1. `src/pages/Index.tsx`**
- Change the root wrapper from `min-h-screen relative overflow-hidden` to `h-screen relative overflow-hidden flex flex-col` so the page is locked to viewport height and lays out vertically.
- Change the inner content wrapper (`<div className="relative z-10">`) to `relative z-10 flex-1 min-h-0 flex flex-col` so it fills remaining space below the navbar.
- Wrap the `Navigation` in a `flex-shrink-0` container (or apply `shrink-0` directly) so it never compresses.
- Wrap the Swap and Pools content areas in a `flex-1 min-h-0` container so they get exactly the leftover height.

**2. `src/components/PoolsInterface.tsx`**
- Replace the hardcoded `h-[calc(100vh-65px)]` with `h-full` (now that the parent gives it the correct remaining height automatically).
- Keep the existing internal layout: header is `flex-shrink-0`, the table card is `flex-1 min-h-0 flex flex-col`, and the rows area is `flex-1 min-h-0 overflow-y-auto`. This already guarantees only the rows scroll.
- Add 4 more entries to the `POOLS` array (e.g. `LINK/ETH`, `ARB/USDC`, `MATIC/USDT`, `SOL/USDC`) with realistic spread/TVL/volume/fees/APR values and matching gradient colors, bringing the total to 10 pools.

### Result
- Logo, nav pill, and Connect Wallet stay perfectly pinned at the top — no movement when scrolling the pool list.
- The "All Pools" card stretches all the way down to touch the bottom edge of the screen on every viewport size (no more hardcoded 65px guess).
- 10 pools are visible, and the rows area scrolls internally while the table header, tabs, and page header all stay fixed.

### Files Modified
- `src/pages/Index.tsx`
- `src/components/PoolsInterface.tsx`