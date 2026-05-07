## Fix steps panel clipping in New Pool view

**Problem**: In `src/components/PoolsInterface.tsx` (`showNewPool` view, lines 143–230), the steps panel sits at `left-[-240px]` relative to a wrapper inside a `max-w-[1100px]` scroll container with `overflow-y-auto`. Per CSS spec, `overflow-y: auto` forces `overflow-x` to behave as `auto` (clipping `visible`), so the negative-offset steps panel is cut off on the left.

**Fix**: Restructure the inner layout so the steps panel and the form sit in a single horizontal row that fits inside the scroll container, while keeping the form visually centered on the page.

### Changes (only inside the `if (showNewPool)` block)

1. **Widen the scroll container** from `max-w-[1100px]` to `max-w-[1500px]` so both panels fit without clipping.
2. **Replace the `relative` wrapper + absolute steps panel** with a flex row:
   - Outer: `flex items-start justify-center gap-6`
   - Steps panel: keeps `w-[442px]` and current styling, but is now a normal flex child (no `absolute`, no negative `left`).
   - Form column: keeps `w-[616px]` and the existing tokens & fee tier card.
3. **Move the "First, select tokens & fee tier" heading** so it stays directly above the form column (inside the form column, not above the row), preserving alignment with the top of the steps panel.
4. **Keep heights matched**: use `self-stretch` on the steps panel so it stretches to the form card's height (replacing the previous `top-0 bottom-0` behavior).

### Result

- Steps panel is fully visible to the left of the form card.
- Form card remains roughly page-centered (the row is `justify-center` inside a wide container).
- No overflow clipping; vertical scroll behavior is preserved.
- No other views (pool list, pool detail) are touched.
