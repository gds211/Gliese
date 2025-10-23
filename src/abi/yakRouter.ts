// src/abi/yakRouter.ts

// NOTE: Your Yak fork returns a single struct (tuple) for quotes
// and uses a Trade struct for swaps.

export const YAK_ROUTER_ABI = [
  // --- Views (quotes) ---
  {
    type: "function",
    name: "findBestPathWithGas",
    stateMutability: "view",
    inputs: [
      { name: "_amountIn",  type: "uint256" },
      { name: "_tokenIn",   type: "address" },
      { name: "_tokenOut",  type: "address" },
      { name: "_maxSteps",  type: "uint256" },
      { name: "_gasPrice",  type: "uint256" },
    ],
    outputs: [
      {
        name: "", type: "tuple",
        components: [
          { name: "amounts",     type: "uint256[]" },
          { name: "adapters",    type: "address[]" },
          { name: "path",        type: "address[]" },
          { name: "gasEstimate", type: "uint256"   },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "findBestPath",
    stateMutability: "view",
    inputs: [
      { name: "_amountIn",  type: "uint256" },
      { name: "_tokenIn",   type: "address" },
      { name: "_tokenOut",  type: "address" },
      { name: "_maxSteps",  type: "uint256" },
    ],
    outputs: [
      {
        name: "", type: "tuple",
        components: [
          { name: "amounts",     type: "uint256[]" },
          { name: "adapters",    type: "address[]" },
          { name: "path",        type: "address[]" },
          { name: "gasEstimate", type: "uint256"   },
        ],
      },
    ],
  },

  // --- Trade struct used by swaps ---
  {
    type: "function",
    name: "swapNoSplitFromAVAX",
    stateMutability: "payable",
    inputs: [
      {
        name: "_trade", type: "tuple",
        components: [
          { name: "amountIn",  type: "uint256" },
          { name: "amountOut", type: "uint256" }, // minOut
          { name: "path",      type: "address[]" },
          { name: "adapters",  type: "address[]" },
        ],
      },
      { name: "_to",   type: "address" },
      { name: "_fee",  type: "uint256" },       // in 1e4 denom (bps)
    ],
    outputs: [],
  },
  // Some forks use lowercase 'v' in Avax
  {
    type: "function",
    name: "swapNoSplitFromAvax",
    stateMutability: "payable",
    inputs: [
      {
        name: "_trade", type: "tuple",
        components: [
          { name: "amountIn",  type: "uint256" },
          { name: "amountOut", type: "uint256" },
          { name: "path",      type: "address[]" },
          { name: "adapters",  type: "address[]" },
        ],
      },
      { name: "_to",   type: "address" },
      { name: "_fee",  type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "swapNoSplitToAVAX",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "_trade", type: "tuple",
        components: [
          { name: "amountIn",  type: "uint256" },
          { name: "amountOut", type: "uint256" },
          { name: "path",      type: "address[]" },
          { name: "adapters",  type: "address[]" },
        ],
      },
      { name: "_to",   type: "address" },
      { name: "_fee",  type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "swapNoSplit",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "_trade", type: "tuple",
        components: [
          { name: "amountIn",  type: "uint256" },
          { name: "amountOut", type: "uint256" },
          { name: "path",      type: "address[]" },
          { name: "adapters",  type: "address[]" },
        ],
      },
      { name: "_to",   type: "address" },
      { name: "_fee",  type: "uint256" },
    ],
    outputs: [],
  },

  // Optional helper reads if you want:
  { type: "function", name: "WNATIVE", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "MIN_FEE", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "adaptersCount", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "ADAPTERS", stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [{ type: "address" }] },

] as const;
