

## Plan: Make the navbar divider line slightly thicker

### Current state
The divider is a pseudo-element hairline on the `<nav>` in `src/components/Navigation.tsx`:
```
after:absolute after:left-0 after:right-0 after:bottom-0
after:h-px after:bg-border
after:origin-bottom after:[transform:scaleY(0.5)]
```
The `scaleY(0.5)` shrinks the 1px line down to ~0.5px visual thickness, which is what makes it look very thin.

### Change
**`src/components/Navigation.tsx`** — Remove the `scaleY(0.5)` shrink so the line renders at its natural 1px thickness (roughly double its current visual weight, but still a clean hairline — not bulky).

- Remove `after:origin-bottom after:[transform:scaleY(0.5)]`
- Keep everything else the same:
  - `after:h-px` (1px tall)
  - `after:bg-border` (same color as before — unchanged)
  - `after:absolute after:left-0 after:right-0 after:bottom-0` (still spans the full width edge-to-edge)

Result: the line stays the same color and still spans the entire width uniformly, but is a bit thicker and therefore more visible.

### Files Modified
- `src/components/Navigation.tsx`

