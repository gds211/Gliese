

## Plan: Remove Bridge/Perps/Markets, left-align nav pill

### 1. Navigation (`src/components/Navigation.tsx`)
- Remove `"Perps"`, `"Markets"`, and `"Bridge"` from the `navItems` array — only `Swap` and `Pools` remain.
- Update `NavigationProps` type unions from `"Swap" | "Bridge" | "Pools"` to `"Swap" | "Pools"`.
- Update the `handleTabClick` guard to only accept `"Swap" | "Pools"`.
- Reposition the nav pill from absolute-centered to left-aligned, sitting immediately to the right of the Gliese logo:
  - Remove `absolute left-1/2 -translate-x-1/2` from the pill container.
  - Place the pill in the normal flex flow next to the logo (e.g. inside a left-side flex group with `gap-6`).
  - `WalletButton` stays on the far right via the parent's `justify-between`.

### 2. Page state (`src/pages/Index.tsx`)
- Update `navSection` and `pendingSection` state types from `"Swap" | "Bridge" | "Pools"` to `"Swap" | "Pools"`.
- Update `handleNavPending` signature accordingly.
- Remove the `BridgeInterface` import and its conditional render branch (`navSection === "Bridge" ? <BridgeInterface /> : null`).
- Remove the bridge asset preload `useEffect` (and the `bridgeIcon` / `wormholeLogo` imports).

### 3. Delete files
- `src/components/BridgeInterface.tsx`
- `src/assets/bridge-icon.svg`
- `src/assets/wormhole-logo.svg`

### Files Modified
- `src/components/Navigation.tsx`
- `src/pages/Index.tsx`

### Files Deleted
- `src/components/BridgeInterface.tsx`
- `src/assets/bridge-icon.svg`
- `src/assets/wormhole-logo.svg`

