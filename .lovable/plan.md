

## Plan: Align the Pools tab divider height with the Swap tab

### Problem
When switching from **Swap** to **Pools**, the navbar's bottom divider line appears to shift upward (the navbar gets shorter). This is because `PoolsInterface` likely renders its own top bar / header that visually competes with — or overlaps — the main `<Navigation>` divider, OR it overlays the page in a way that hides part of the navbar's bottom edge.

### Investigation needed
Before changing anything, I need to read:
- `src/components/PoolsInterface.tsx` — to see how the Pools view is rendered (full overlay? own header? own border?).
- Confirm how it's mounted in `src/pages/Index.tsx` (already visible: it's rendered as a sibling overlay when `navSection === "Pools"`).

This will let me pinpoint whether:
1. Pools renders a covering element with its own (higher) border, OR
2. Pools changes the navbar's effective height (e.g. adds padding/margin), OR
3. Pools has its own top divider drawn at a different y-position than the navbar's `after:` hairline.

### Likely fix (pending file read)
Whichever element in `PoolsInterface` is drawing the visible "higher" divider, align it so the line sits at the exact same vertical position as the `<Navigation>` component's `after:` hairline (i.e. immediately below the same `py-4` navbar padding). Concretely this will be one of:
- Remove a redundant top border on the Pools container so the real navbar divider shows through, OR
- If Pools overlays the navbar, ensure its top edge starts **below** the navbar (not on top of it) so the navbar's own divider remains the only one shown — at the same height as on the Swap tab.

No color or thickness changes — only vertical alignment.

### Files likely modified
- `src/components/PoolsInterface.tsx` (primary)
- Possibly `src/pages/Index.tsx` if the overlay positioning needs adjustment

### Files Modified
- `src/components/PoolsInterface.tsx`

