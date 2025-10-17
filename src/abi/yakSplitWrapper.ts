// src/abi/yakSplitWrapper.ts
export const YAK_SPLIT_WRAPPER_ABI = [
  {
    type: "function",
    name: "splitSwapExactIn",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenIn", type: "address" },
      { name: "tokenOut", type: "address" },
      { name: "amountIn", type: "uint256" },
      { name: "minTotalAmountOut", type: "uint256" },
      { name: "recipient", type: "address" },
      { name: "deadline", type: "uint256" },
      {
        name: "legs",
        type: "tuple[]",
        components: [
          { name: "target", type: "address" },
          { name: "callData", type: "bytes" },
          { name: "amountIn", type: "uint256" }
        ]
      }
    ],
    outputs: []
  },
  { type: "function", name: "feeRecipient", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "feeBps",       stateMutability: "view", inputs: [], outputs: [{ type: "uint16"  }] },
];

