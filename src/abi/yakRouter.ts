// src/abi/yakRouter.ts
// Complete ABI for the functions your app reads/writes (incl. split swappers).

export const YAK_ROUTER_ABI = [
  // -------- Views (quotes) --------
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
        type: "tuple",
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
        type: "tuple",
        components: [
          { name: "amounts",     type: "uint256[]" },
          { name: "adapters",    type: "address[]" },
          { name: "path",        type: "address[]" },
          { name: "gasEstimate", type: "uint256"   },
        ],
      },
    ],
  },

  // -------- Simple helper reads --------
  { type: "function", name: "WNATIVE", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "MIN_FEE", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },

  // -------- No-split swappers (kept for backwards compat) --------
  {
    type: "function",
    name: "swapNoSplit",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "_trade",
        type: "tuple",
        components: [
          { name: "amountIn",  type: "uint256"  },
          { name: "amountOut", type: "uint256"  },
          { name: "path",      type: "address[]" },
          { name: "adapters",  type: "address[]" },
        ],
      },
      { name: "_to",  type: "address" },
      { name: "_fee", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "swapNoSplitFromAVAX",
    stateMutability: "payable",
    inputs: [
      {
        name: "_trade",
        type: "tuple",
        components: [
          { name: "amountIn",  type: "uint256"  },
          { name: "amountOut", type: "uint256"  },
          { name: "path",      type: "address[]" },
          { name: "adapters",  type: "address[]" },
        ],
      },
      { name: "_to",  type: "address" },
      { name: "_fee", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "swapNoSplitToAVAX",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "_trade",
        type: "tuple",
        components: [
          { name: "amountIn",  type: "uint256"  },
          { name: "amountOut", type: "uint256"  },
          { name: "path",      type: "address[]" },
          { name: "adapters",  type: "address[]" },
        ],
      },
      { name: "_to",  type: "address" },
      { name: "_fee", type: "uint256" },
    ],
    outputs: [],
  },

  // -------- Split swappers --------
  {
    type: "function",
    name: "swapSplit",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "a",
        type: "tuple",
        components: [
          { name: "amountIn",  type: "uint256"  },
          { name: "amountOut", type: "uint256"  },
          { name: "path",      type: "address[]" },
          { name: "adapters",  type: "address[]" },
        ],
      },
      {
        name: "b",
        type: "tuple",
        components: [
          { name: "amountIn",  type: "uint256"  },
          { name: "amountOut", type: "uint256"  },
          { name: "path",      type: "address[]" },
          { name: "adapters",  type: "address[]" },
        ],
      },
      { name: "_to",          type: "address"  },
      { name: "_minTotalOut", type: "uint256"  },
      { name: "_fee",         type: "uint256"  },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "swapSplitFromAVAX",
    stateMutability: "payable",
    inputs: [
      {
        name: "a",
        type: "tuple",
        components: [
          { name: "amountIn",  type: "uint256"  },
          { name: "amountOut", type: "uint256"  },
          { name: "path",      type: "address[]" },
          { name: "adapters",  type: "address[]" },
        ],
      },
      {
        name: "b",
        type: "tuple",
        components: [
          { name: "amountIn",  type: "uint256"  },
          { name: "amountOut", type: "uint256"  },
          { name: "path",      type: "address[]" },
          { name: "adapters",  type: "address[]" },
        ],
      },
      { name: "_to",          type: "address"  },
      { name: "_minTotalOut", type: "uint256"  },
      { name: "_fee",         type: "uint256"  },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "swapSplitToAVAX",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "a",
        type: "tuple",
        components: [
          { name: "amountIn",  type: "uint256"  },
          { name: "amountOut", type: "uint256"  },
          { name: "path",      type: "address[]" },
          { name: "adapters",  type: "address[]" },
        ],
      },
      {
        name: "b",
        type: "tuple",
        components: [
          { name: "amountIn",  type: "uint256"  },
          { name: "amountOut", type: "uint256"  },
          { name: "path",      type: "address[]" },
          { name: "adapters",  type: "address[]" },
        ],
      },
      { name: "_to",          type: "address"  },
      { name: "_minTotalOut", type: "uint256"  },
      { name: "_fee",         type: "uint256"  },
    ],
    outputs: [],
  },

  // -------- Split swappers with permit --------
  {
    type: "function",
    name: "swapSplitWithPermit",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "a",
        type: "tuple",
        components: [
          { name: "amountIn",  type: "uint256"  },
          { name: "amountOut", type: "uint256"  },
          { name: "path",      type: "address[]" },
          { name: "adapters",  type: "address[]" },
        ],
      },
      {
        name: "b",
        type: "tuple",
        components: [
          { name: "amountIn",  type: "uint256"  },
          { name: "amountOut", type: "uint256"  },
          { name: "path",      type: "address[]" },
          { name: "adapters",  type: "address[]" },
        ],
      },
      { name: "_to",          type: "address"  },
      { name: "_minTotalOut", type: "uint256"  },
      { name: "_fee",         type: "uint256"  },
      { name: "_deadline",    type: "uint256"  },
      { name: "_v",           type: "uint8"    },
      { name: "_r",           type: "bytes32"  },
      { name: "_s",           type: "bytes32"  },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "swapSplitToAVAXWithPermit",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "a",
        type: "tuple",
        components: [
          { name: "amountIn",  type: "uint256"  },
          { name: "amountOut", type: "uint256"  },
          { name: "path",      type: "address[]" },
          { name: "adapters",  type: "address[]" },
        ],
      },
      {
        name: "b",
        type: "tuple",
        components: [
          { name: "amountIn",  type: "uint256"  },
          { name: "amountOut", type: "uint256"  },
          { name: "path",      type: "address[]" },
          { name: "adapters",  type: "address[]" },
        ],
      },
      { name: "_to",          type: "address"  },
      { name: "_minTotalOut", type: "uint256"  },
      { name: "_fee",         type: "uint256"  },
      { name: "_deadline",    type: "uint256"  },
      { name: "_v",           type: "uint8"    },
      { name: "_r",           type: "bytes32"  },
      { name: "_s",           type: "bytes32"  },
    ],
    outputs: [],
  },
] as const;
