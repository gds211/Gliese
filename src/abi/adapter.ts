// src/abi/adapter.ts
export const ADAPTER_ABI = [
  { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "swapGasEstimate", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    type: "function",
    name: "query",
    stateMutability: "view",
    inputs: [
      { name: "_amountIn", type: "uint256" },
      { name: "_tokenIn", type: "address" },
      { name: "_tokenOut", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
] as const;

