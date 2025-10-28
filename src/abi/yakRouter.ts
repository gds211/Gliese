// src/abi/yakRouter.ts
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
    name: "WNATIVE",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "MIN_FEE",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },

  // --- Swaps (we keep single-route swap for completeness, used by executor) ---
  {
    type: "function",
    name: "swapNoSplit",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "_trade",
        type: "tuple",
        components: [
          { name: "amountIn",  type: "uint256" },
          { name: "amountOut", type: "uint256" },
          { name: "path",      type: "address[]" },
          { name: "adapters",  type: "address[]" },
        ],
      },
      { name: "_to",  type: "address"  },
      { name: "_fee", type: "uint256"  },
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
          { name: "amountIn",  type: "uint256" },
          { name: "amountOut", type: "uint256" },
          { name: "path",      type: "address[]" },
          { name: "adapters",  type: "address[]" },
        ],
      },
      { name: "_to",  type: "address"  },
      { name: "_fee", type: "uint256"  },
    ],
    outputs: [],
  },
] as const;
