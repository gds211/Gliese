// src/abi/multicall3.ts
export const MULTICALL3_ABI = [
  {
    type: "function",
    name: "aggregate3Value",
    stateMutability: "payable",
    inputs: [
      {
        name: "calls",
        type: "tuple[]",
        components: [
          { name: "target",       type: "address" },
          { name: "allowFailure", type: "bool"    },
          { name: "value",        type: "uint256" },
          { name: "callData",     type: "bytes"   },
        ],
      },
    ],
    outputs: [
      {
        name: "returnData",
        type: "tuple[]",
        components: [
          { name: "success",    type: "bool"  },
          { name: "returnData", type: "bytes" },
        ],
      },
    ],
  },
] as const;

