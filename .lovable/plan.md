## Plan: Update Pools Table Headers and Add Spread Category Column

### Changes to `src/components/PoolsInterface.tsx`

**1. Rename column headers:**
- `Pool Spread` → `Pool`
- `24H Volume` → `Volume 24H`
- `24H Fees` → `Fees 24H`
- `24H APR` → `APR 24H`

**2. Add a new "Spread" column between `Pool` and `TVL`:**
- Each pool gets one of: `Tight`, `Moderate`, `Broad`, `Wide`
- Rendered as plain white text using the same font/style as the other data cells (`text-sm font-semibold text-foreground`) — no badges, no colored backgrounds, no pills.
- Add `Spread` header (uppercase, same style as other headers).

**3. Grid layout update:**
- Change grid template from `[40px_2fr_1fr_1fr_1fr_1fr_120px]` to `[40px_2fr_1fr_1fr_1fr_1fr_1fr_120px]` (extra column between Pool and TVL) on both header and rows.

**4. Per-pool category assignments:**
| Pair | Category |
|---|---|
| USDC/USDT | Tight |
| ETH/USDC | Moderate |
| DAI/USDC | Tight |
| ETH/USDT | Moderate |
| WBTC/ETH | Broad |
| MON/USDC | Wide |
| ARB/USDC | Moderate |
| SOL/USDT | Broad |
| LINK/ETH | Broad |
| MATIC/USDC | Moderate |

### Technical notes
- Add `category: "Tight" | "Moderate" | "Broad" | "Wide"` to the `Pool` type and to each entry in `POOLS`.
- The existing per-pool spread percentage badge next to the pair name (e.g. `0.01%`) stays unchanged.
- No other files need to change.
