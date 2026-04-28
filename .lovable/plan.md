## Plan: Lock Swap page scroll, hide scrollbar in Pools list

### Swap interface — no scrolling at all
The Swap page currently uses `min-h-[calc(100vh-80px)]` on its wrapper in `src/pages/Index.tsx`, which lets the page grow past the viewport and scroll.

- In `src/pages/Index.tsx`, when `navSection === "Swap"`, change the wrapper to a fixed-height, non-scrolling container:
  - Replace `min-h-[calc(100vh-80px)]` with `h-[calc(100vh-65px)] overflow-hidden`.
- Also ensure the root page wrapper does not allow scroll: it already has `min-h-screen relative overflow-hidden`, which is fine. No body-level changes needed.

Result: on the Swap tab the user cannot scroll at all — the swap card stays locked in place.

### Pools interface — scroll only the All Pools list, no visible scrollbar, navbar/logo/wallet stay fixed
The navbar (Gliese logo + nav pill + Connect Wallet) is rendered once in `Index.tsx` above the section content and is not inside any scrolling container, so it already stays in place as long as the page itself doesn't scroll.

`PoolsInterface` is already height-locked (`h-[calc(100vh-65px)] overflow-hidden`) and only the rows container scrolls (`flex-1 min-h-0 overflow-y-auto`). The remaining task is to **hide the scrollbar visually** while keeping wheel/touchpad scrolling functional.

1. Add a cross-browser `.no-scrollbar` utility in `src/index.css`:

```css
@layer utilities {
  .no-scrollbar {
    scrollbar-width: none;            /* Firefox */
    -ms-overflow-style: none;         /* IE / old Edge */
  }
  .no-scrollbar::-webkit-scrollbar {  /* Chrome / Safari / new Edge */
    display: none;
  }
}
```

2. In `src/components/PoolsInterface.tsx`, on the rows wrapper, append `no-scrollbar`:

```
className="flex-1 min-h-0 overflow-y-auto no-scrollbar"
```

Result on the Pools tab:
- The page itself does not scroll.
- The Gliese logo, centered nav pill, and Connect Wallet button stay perfectly fixed.
- Only the All Pools rows area scrolls when the list overflows.
- No scrollbar is visible.

### Out of scope / not changed
- The Radix `ScrollArea` styling block in `src/index.css` (used inside the Swap token list popover) is left untouched, per your clarification that this is only about page-level scrolling in Swap and the All Pools list scrollbar in Pools.
- The orange top loading bar is not removed.

### Files Modified
- `src/pages/Index.tsx`
- `src/index.css`
- `src/components/PoolsInterface.tsx`
