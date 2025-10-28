// src/abi/yakSplitExecutor.ts
export const YAK_SPLIT_EXECUTOR_ABI = [
  {
    type: "function",
    name: "splitSwapERC20",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "trades",
        type: "tuple[]",
        components: [
          { name: "amountIn",  type: "uint256" },
          { name: "amountOut", type: "uint256" },
          { name: "path",      type: "address[]" },
          { name: "adapters",  type: "address[]" },
        ],
      },
      { name: "to",              type: "address" },
      { name: "feeBps",          type: "uint256" },
      { name: "minTotalOut",     type: "uint256" },
      { name: "unwrapNativeOut", type: "bool"    },
    ],
    outputs: [{ name: "totalOut", type: "uint256" }],
  },
  {
    type: "function",
    name: "splitSwapNative",
    stateMutability: "payable",
    inputs: [
      {
        name: "trades",
        type: "tuple[]",
        components: [
          { name: "amountIn",  type: "uint256" },
          { name: "amountOut", type: "uint256" },
          { name: "path",      type: "address[]" },
          { name: "adapters",  type: "address[]" },
        ],
      },
      { name: "to",              type: "address" },
      { name: "feeBps",          type: "uint256" },
      { name: "minTotalOut",     type: "uint256" },
      { name: "unwrapNativeOut", type: "bool"    },
    ],
    outputs: [{ name: "totalOut", type: "uint256" }],
  },
] as const;

