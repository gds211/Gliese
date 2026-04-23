

## Plan: Rename "Explore" → "Pools" (label, section key, and component file)

### 1. Rename component file
- Rename `src/components/ExploreInterface.tsx` → `src/components/PoolsInterface.tsx`
- Rename the component export from `ExploreInterface` to `PoolsInterface`

### 2. Navigation (`src/components/Navigation.tsx`)
- Update `NavigationProps` type unions from `"Swap" | "Bridge" | "Explore"` to `"Swap" | "Bridge" | "Pools"`
- In `navItems`, change `{ name: "Explore", ... }` to `{ name: "Pools", ... }`
- Update the `handleTabClick` guard to accept `"Pools"` instead of `"Explore"`

### 3. Page state (`src/pages/Index.tsx`)
- Change all `"Explore"` string literals and type unions to `"Pools"` (state, default values, conditional rendering, loading bar logic, handlers)
- Update the import from `ExploreInterface` to `PoolsInterface` and update the JSX usage accordingly

### 4. Aggregator label in Swap UI (Instant tab)
- `src/components/SwapInterface.tsx` — Replace `Wrapdrive v1.1` with `Gliese AMM`

### 5. Aggregator label in Trigger tab
- `src/components/TriggerInterface.tsx` — Replace `Wrapdrive v1.1` with `Gliese AMM`

### Files Modified
- `src/components/ExploreInterface.tsx` → renamed to `src/components/PoolsInterface.tsx`
- `src/components/Navigation.tsx`
- `src/pages/Index.tsx`
- `src/components/SwapInterface.tsx`
- `src/components/TriggerInterface.tsx`

