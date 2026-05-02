## Add Liquidity view (triggered from + Add button in Pools)

When the user clicks the `+ Add` button on any pool row in the Pools interface, replace the pools list view with an "Add Liquidity" sub-view styled to match the sketch. Clicking `< Back` returns to the pools list.

All work is contained inside `src/components/PoolsInterface.tsx` — no routing changes, no new pages.

### Layout (matches the sketch)

Top of the panel:
- `< Back` button (top-left, outside the cards) — returns to pools list.

Two side-by-side cards (responsive: stacks on narrow widths):

**Left card — Pool Composition**
- Header row: title `Pool Composition` on the left, `Flexible Ratio` label on the right (muted).
- Horizontal stacked bar showing the two-token composition:
  - Token A segment in the token's primary color (e.g. yellow for USDC) with `57.1% USDC` label.
  - Token B segment in its color (e.g. blue for ETH) with `42.9% ETH` label.
- Composition percentages are derived from the current input amounts (token A USD value / total USD value). When both inputs are 0, default to 50 / 50.

**Right card — Add Liquidity**
- Title `Add Liquidity`.
- Two token input rows, one per pool token (in the order shown by the pool, e.g. ETH then USDC for ETH/USDC pool):
  - Top-right of each row: small balance chip `0.00 ETH` plus `HALF` and `MAX` pill buttons.
  - Left: token avatar circle (reusing the existing `TokenPair` gradient styling for a single token) and the token symbol.
  - Right: large numeric input (`0.00`) and `$0.00` USD value below it.
  - Inputs are linked: typing in one auto-fills the other using the displayed pool ratio (use the percentages from Pool Composition / a constant ratio derived from the pool, since this is a UI mock without real prices).
- Full-width `Add Liquidity` button at the bottom, styled like the existing primary action buttons (white pill on dark, matching `New Pool` button).

### Behaviour

- New state in `PoolsInterface`: `selectedPool: Pool | null`.
- `+ Add` button on a row calls `setSelectedPool(pool)`.
- When `selectedPool` is set, render the Add Liquidity view instead of the table card (header + tabs row stays hidden in this view; the page-level header `Liquidity Pools / Provide liquidity and earn trading fees` is replaced by the pool pair name as the title, e.g. `Add liquidity to ETH/USDC` with the spread chip next to it).
- `< Back` resets `selectedPool` to `null` and returns the user to the pools list with sort and search state preserved.
- HALF / MAX buttons fill the input from a mocked balance of `0` (so they currently set `0.00`); the wiring is in place for when real balances land.

### Visual tokens

Reuse existing styling conventions from the file:
- Cards: `rounded-2xl border border-white/10` with `backgroundColor: "#131313"`.
- Inner sub-cards / inputs: `bg-muted/40 backdrop-blur-md border border-white/10 rounded-lg`.
- Primary accents (`HALF`, `MAX` chips, focused borders): `text-primary` / `bg-primary/15`.
- Composition bar segments use the gradient classes already defined on each `Pool` (`colorA`, `colorB`).

### Files modified

- `src/components/PoolsInterface.tsx` — add `selectedPool` state, an `AddLiquidityView` sub-component rendered inline, and wire the `+ Add` button.
