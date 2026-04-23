

## Plan: Shift nav pill slightly to the right

### Change
**`src/components/Navigation.tsx`** — Increase the spacing between the Gliese logo and the nav pill (Swap / Pools) so the pill sits a bit further to the right.

- The logo + pill are currently inside a left-side flex container with `gap-6` (24px).
- Increase the gap to `gap-12` (48px) so the pill shifts ~24px to the right while the logo stays anchored on the left.

### Files Modified
- `src/components/Navigation.tsx`

