

## Plan: Make navbar divider clearly visible across full width (without changing width or color)

### Problem
The current divider uses `border-b-[0.3px] border-border`. The `0.3px` width is sub-pixel and renders inconsistently — on many displays it's partially or fully invisible, and the rendering can vary across the width of the line. The user wants it clearly visible everywhere, but **without** making it thicker or changing its color.

### Approach
Keep the existing visual weight (`0.3px`) and color (`border-border`) intentions, but switch from a CSS `border` (which suffers from sub-pixel rendering issues) to a crisp 1-device-pixel line that always renders fully across the entire surface.

### Change
**`src/components/Navigation.tsx`** — Replace the bottom border on the `<nav>` with a pseudo-element hairline:

- Remove `border-b-[0.3px] border-border` from the `<nav>` element.
- Add `relative` to the `<nav>` and an `after:` pseudo-element that:
  - Spans the full width: `after:absolute after:left-0 after:right-0 after:bottom-0`
  - Is exactly 1 physical pixel tall on all displays: `after:h-px`
  - Uses the same color token as before: `after:bg-border`
  - On high-DPI screens, scale it down so the *visual* thickness matches the original ~0.3px intent: `after:[transform:scaleY(0.5)] after:origin-bottom`

This guarantees the line paints uniformly across the full width of the page (no sub-pixel gaps), while preserving the same hairline appearance and the existing `border` color.

### Files Modified
- `src/components/Navigation.tsx`

