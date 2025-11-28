// src/config/wormhole.ts
import type {
  WormholeConnectConfig,
  WormholeConnectTheme,
} from "@wormhole-foundation/wormhole-connect";

/**
 * Wormhole Connect configuration
 * - network: Testnet for now (matches your current dev environment)
 * - chains: adjust to the testnets / mainnets you actually want to support
 */
export const wormholeConfig: WormholeConnectConfig = {
  // Use Wormhole Testnet. Switch to "Mainnet" when you're ready.
  network: "Testnet",

  // Chains to show in the widget. You can trim / change this list.
  // Names must match Wormhole's chain IDs (see chains.ts in the SDK). :contentReference[oaicite:4]{index=4}
  chains: ["Monad", "Sepolia", "BaseSepolia"],

  ui: {
    // We keep this empty so YOUR card header is the visible title
    title: "",
    // Hide the hamburger menu; keeps the widget cleaner inside your card. :contentReference[oaicite:5]{index=5}
    showHamburgerMenu: false,
  },
  // Optional: you can add tokensConfig, routes, rpcs, etc. here later.
};

/**
 * Theme so Wormhole Connect visually matches your app.
 * Only `mode` is required; everything else is optional. :contentReference[oaicite:6]{index=6}
 */
export const wormholeTheme: WormholeConnectTheme = {
  mode: "dark",
  primary: "#22c55e", // roughly Tailwind's emerald-500 / your "primary" accent

  // You can uncomment/tune these to match your design system:
  // input: "#1F2933",
  // secondary: "#4B5563",
  // text: "#FFFFFF",
  // textSecondary: "#9CA3AF",
  // error: "#F97373",
  // success: "#4ADE80",
  // font: "system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
};

