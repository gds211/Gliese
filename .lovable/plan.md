## Pools interface header tweaks

Three small adjustments scoped to `src/components/PoolsInterface.tsx`.

### 1. Match the magnifying glass icon style from the swap modal

The Search pools input already has a magnifying glass icon, but it uses `text-muted-foreground`. Update it to match the swap modal's "Select a token to sell" search exactly:

- Icon classes: `absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50`

No other changes to the input's background or border — keep the current glass look untouched.

### 2. Vertically align Search + New Pool with the subtitle

Currently the header wrapper uses `items-start`, so the buttons line up with the "Liquidity Pools" title. Switch to `items-end` so the Search input and New Pool button drop down and align with the bottom "Provide liquidity and earn trading fees" subtitle.

```text
Before                                After
┌ Liquidity Pools     [Search][New]   ┌ Liquidity Pools
└ Provide liquidity…                  └ Provide liquidity…  [Search][New]
```

### 3. White "New Pool" button with black text

Replace the orange gradient on the New Pool button:

- From: `bg-gradient-to-r from-primary to-orange-500 text-primary-foreground`
- To: `bg-white text-black hover:bg-white/90`

The Plus icon inherits `currentColor` so it becomes black automatically.

### Files modified
- `src/components/PoolsInterface.tsx`
