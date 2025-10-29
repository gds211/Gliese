// src/abi/yakRouter.ts
// Exact signatures from your fork (IYakRouter/YakRouter).
// Includes:
//  - Quotes: findBestPath, findBestPathWithGas -> FormattedOffer (tuple)
//  - Swaps:  swapNoSplit / FromAVAX (payable) / ToAVAX
//  - Router constants: WNATIVE(), MIN_FEE()
//  - Counters: adaptersCount(), trustedTokensCount()
// All entries are viem-friendly and "as const" for strong typing.

/** Tuple returned by quote functions */
export type YakFormattedOffer = {
  amounts: readonly bigint[];
  adapters: readonly `0x${string}`[];
  path: readonly `0x${string}`[];
  gasEstimate: bigint;
};

/** Trade struct expected by swap functions */
export type YakTrade = {
  amountIn: bigint;
  amountOut: bigint; // this is "minOut" in your app usage
  path: readonly `0x${string}`[];
  adapters: readonly `0x${string}`[];
};

export const YAK_ROUTER_ABI = [
  // --- Views (quotes) ---
  {
    type: "function",
    name: "findBestPathWithGas",
    stateMutability: "view",
    inputs: [
      { name: "_amountIn", type: "uint256" },
      { name: "_tokenIn", type: "address" },
      { name: "_tokenOut", type: "address" },
      { name: "_maxSteps", type: "uint256" },
      { name: "_gasPrice", type: "uint256" },
    ],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "amounts", type: "uint256[]" },
          { name: "adapters", type: "address[]" },
          { name: "path", type: "address[]" },
          { name: "gasEstimate", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "findBestPath",
    stateMutability: "view",
    inputs: [
      { name: "_amountIn", type: "uint256" },
      { name: "_tokenIn", type: "address" },
      { name: "_tokenOut", type: "address" },
      { name: "_maxSteps", type: "uint256" },
    ],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "amounts", type: "uint256[]" },
          { name: "adapters", type: "address[]" },
          { name: "path", type: "address[]" },
          { name: "gasEstimate", type: "uint256" },
        ],
      },
    ],
  },

  // --- Swaps (Trade struct + to + feeBps) ---
  {
    type: "function",
    name: "swapNoSplit",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "_trade",
        type: "tuple",
        components: [
          { name: "amountIn", type: "uint256" },
          { name: "amountOut", type: "uint256" },
          { name: "path", type: "address[]" },
          { name: "adapters", type: "address[]" },
        ],
      },
      { name: "_to", type: "address" },
      { name: "_fee", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "swapNoSplitFromAVAX", // "AVAX" == native in Yak naming
    stateMutability: "payable",
    inputs: [
      {
        name: "_trade",
        type: "tuple",
        components: [
          { name: "amountIn", type: "uint256" },
          { name: "amountOut", type: "uint256" },
          { name: "path", type: "address[]" },
          { name: "adapters", type: "address[]" },
        ],
      },
      { name: "_to", type: "address" },
      { name: "_fee", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "swapNoSplitToAVAX", // out = native
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "_trade",
        type: "tuple",
        components: [
          { name: "amountIn", type: "uint256" },
          { name: "amountOut", type: "uint256" },
          { name: "path", type: "address[]" },
          { name: "adapters", type: "address[]" },
        ],
      },
      { name: "_to", type: "address" },
      { name: "_fee", type: "uint256" },
    ],
    outputs: [],
  },

  // --- Misc router views you use in swap.ts ---
  { type: "function", name: "WNATIVE", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "MIN_FEE", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },

  // --- Useful counters (used for diagnostics / sanity checks) ---
  { type: "function", name: "adaptersCount", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "trustedTokensCount", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;
