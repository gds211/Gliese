

# Explore Page: Token Explorer Table

## Overview
Add a token explorer table to the Explore page, matching the design from the reference screenshot. The table will display mock token data with columns for token info, price, market cap, volume, liquidity, holders, fees paid, a 24h sparkline chart, and a buy button -- all rendered over the existing frosted glass overlay.

## Layout Structure

**Top filter bar** -- A row of category pill buttons (e.g., "Cooking", "Top Traded", "Stablecoins") plus time-range toggles (5m, 1h, 6h, 24h) on the right side.

**Data table** -- Full-width table with these columns:
1. **Token/Age** -- Avatar, token name with verified badge, age label, and small icon links
2. **Price/%Change** -- Current price + percentage change (green/red)
3. **MC/FDV** -- Market cap and fully diluted valuation
4. **24h Vol / Net** -- 24h volume and net volume
5. **Liquidity** -- Liquidity amount
6. **Holders/%Change** -- Holder count and percentage change
7. **Fees Paid** -- Fee amount in SOL (or MON for Monad context)
8. **Last 24h** -- Mini sparkline chart (using Recharts, already installed)
9. **Buy** -- A small "+" action button

## Styling
- Keep the existing glassmorphism background (bg-white/10, backdrop-blur-xl, radial darkening)
- Table text in white/light gray to contrast with the dark glass background
- Green for positive changes, red for negative
- Transparent/borderless table rows with subtle dividers (border-white/5)
- Category pills styled similarly to the nav pills (rounded-full, bg-white/10)
- Highlighted values (like the yellow "$178" badge in the screenshot) use accent-colored badges

## Technical Details

### Files to create
- `src/components/explore/ExploreTokenTable.tsx` -- Main table component with mock data and rendering
- `src/components/explore/SparklineChart.tsx` -- Tiny Recharts line chart for the "Last 24h" column
- `src/components/explore/ExploreFilters.tsx` -- Top filter bar with category pills and time toggles

### Files to modify
- `src/components/ExploreInterface.tsx` -- Import and render the new components inside the glass container, add scroll support with overflow-y-auto

### Mock data
Since there is no backend, hardcode ~10 rows of realistic-looking token data (names like pippin, PUMP, USELESS, etc. inspired by the screenshot but adapted for the Monad/MON context).

### Recharts sparkline
Use `<LineChart>` from recharts (already installed) with no axes, no grid, no tooltip -- just a thin green/red line based on whether the trend is up or down. Each token row gets a small array of random price points.

### Scrolling
The content area will be scrollable (`overflow-y-auto`) within the glass container so the table can grow beyond the viewport.

