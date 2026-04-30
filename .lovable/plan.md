## Pools interface: Deposit button + remove row hover tint

All changes scoped to `src/components/PoolsInterface.tsx`.

### 1. Replace "+ Add" button with "Deposit" button

The reference image shows a pill-shaped button with:
- Transparent / dark fill
- A solid 1px border in the accent color
- Centered label text in the same accent color
- Rounded-full corners
- No icon

Match that style but in our orange primary instead of cyan. The new button will:
- Drop the `Plus` icon
- Use label text `Deposit`
- Be `rounded-full`, transparent background, `border border-primary`, `text-primary`
- Padding tuned to look like the reference (roughly `px-5 py-1.5`)
- On hover: subtle `bg-primary/10` fill; border and text stay orange
- Keep it right-aligned in the existing 120px action column

### 2. Remove grey hover tint on pool rows

Current row class includes `hover:bg-white/5`, which lightens the row on hover. Remove that class so hovering a row in All Pools no longer changes its background. Other interactive children (the Deposit button) keep their own hover state.

### Technical details

In `src/components/PoolsInterface.tsx`:

- Row container: remove `hover:bg-white/5` from the `grid` row inside `sorted.map(...)`. Keep `transition-colors` (harmless) or drop it.
- Action button JSX, replace:
  ```tsx
  <button className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary/15 text-primary text-base hover:bg-primary/25 transition-colors">
    <Plus className="w-3.5 h-3.5" />
    Add
  </button>
  ```
  with:
  ```tsx
  <button className="px-5 py-1.5 rounded-full border border-primary text-primary text-sm hover:bg-primary/10 transition-colors">
    Deposit
  </button>
  ```
- `Plus` is still used by the "New Pool" header button, so leave the import as-is.

### Files modified
- `src/components/PoolsInterface.tsx`
