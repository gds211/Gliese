## Increase font size in Pools interface

Bump the body/table text in the All Pools section up one Tailwind step so it reads more comfortably while keeping the layout intact.

### Changes in `src/components/PoolsInterface.tsx`

- **Tabs (All Pools / My Positions)**: `text-sm` → `text-base`
- **Table header row** (#, Pool, Spread, TVL, Volume 24H, Fees 24H, APR 24H): `text-[11px]` → `text-xs` (12px)
- **Table data rows** (id, pair name, spread badge, category, TVL, Volume, Fees, APR, Add button): `text-sm` → `text-base`; spread badge `text-[11px]` → `text-xs`
- **Token symbol initials inside circles**: `text-[9px]` → `text-[10px]` so they stay legible against the slightly larger row height

Header title ("Liquidity Pools"), subtitle, search input, and "New Pool" button stay the same — the request is scoped to the All Pools table section.
