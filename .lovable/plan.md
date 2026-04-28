

## Plan: Align Pools tab divider with Swap tab divider

### Root cause
On the Swap tab, the only divider visible is the navbar's own `after:` hairline (`bg-border`, drawn at the bottom of `<nav>`).

On the Pools tab, `PoolsInterface` is rendered as an overlay positioned at a **hardcoded `top-[73px]`** and includes its **own top edge highlight line**:
```tsx
<div className="absolute inset-x-0 top-0 h-px bg-white/20" />
```
This produces a second, brighter line at a slightly different vertical position than the real navbar divider — which is what the user perceives as the divider "getting higher" / shifting when switching tabs.

### Fix
**`src/components/PoolsInterface.tsx`** — Stop drawing a competing divider and stop relying on a hardcoded offset, so the navbar's own `after:` divider remains the single, consistent divider in both tabs at exactly the same height.

Concrete changes:
1. **Remove the duplicate divider line** inside `PoolsInterface`:
   - Delete `<div className="absolute inset-x-0 top-0 h-px bg-white/20" />`.
2. **Remove the hardcoded `top-[73px]` offset** so the Pools overlay no longer depends on guessing the navbar's exact pixel height. Instead, mount it below the navbar using normal flow.

### Implementation approach for (2)
Two equivalent options — I'll go with **Option A** because it requires no changes to `Index.tsx`:

- **Option A (recommended):** Change `PoolsInterface`'s root from `absolute inset-0 top-[73px] z-20` to `relative w-full h-[calc(100vh-theme_navbar_height)] z-20`. Since the navbar is rendered above it in normal document flow inside `<div className="relative z-10">`, using `relative` positioning will automatically place Pools immediately below the navbar — at the exact pixel where the navbar's `after:` divider lives — regardless of the navbar's actual height. The height becomes `min-h-[calc(100vh-73px)]` replaced by simply `flex-1` / a min-height that fills the remaining viewport.

  Concretely: change root wrapper to:
  ```tsx
  <div className="relative w-full min-h-[calc(100vh-65px)] z-20">
  ```
  and remove the inner `<div className="relative w-full h-full">` wrapper-only-needed-for-absolute-positioning (keep the children but flatten one level), or keep it and switch the children to fill `h-full`.

- **Option B (fallback if Option A causes layout regressions for the Swap content):** keep `absolute` but anchor the top using `top-full` from the navbar instead of `top-[73px]`. This requires moving `<PoolsInterface>` to render as a sibling **inside** the navbar's parent flex/relative container. More invasive, so prefer Option A.

### Result
- The navbar's `after:bg-border` hairline is the **only** divider in both tabs.
- It stays at the **exact same y-position** when switching between Swap and Pools (because the Pools overlay no longer overlaps the navbar nor draws its own line).
- No color, thickness, or styling changes to the divider itself.

### Files Modified
- `src/components/PoolsInterface.tsx`

