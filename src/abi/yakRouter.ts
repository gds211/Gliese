// src/abi/yakRouter.ts
// Keep all variants we might need, depending on your exact Router build.
export const YAK_ROUTER_ABI = [
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
      { name: "amounts",   type: "uint256[]" },
      { name: "adapters",  type: "address[]" },
      { name: "path",      type: "address[]" },
      { name: "gasUsed",   type: "uint256"   },
    ],
  },

  // ERC20 -> ERC20
  {
    type: "function",
    name: "swapNoSplit",
    stateMutability: "nonpayable",
    inputs: [
      { name:"amountIn",       type:"uint256" },
      { name:"amountOutMin",   type:"uint256" },
      { name:"path",           type:"address[]" },
      { name:"adapters",       type:"address[]" },
    ],
    outputs: []
  },

  // Native -> Token (some repos name it FromAVAX or FromAvax)
  {
    type: "function",
    name: "swapNoSplitFromAVAX",
    stateMutability: "payable",
    inputs: [
      { name:"amountIn",       type:"uint256" },    // Many Yak forks include this param; if yours omits it, we’ll handle below.
      { name:"amountOutMin",   type:"uint256" },
      { name:"path",           type:"address[]" },
      { name:"adapters",       type:"address[]" },
    ],
    outputs: []
  },
  {
    type: "function",
    name: "swapNoSplitFromAvax",
    stateMutability: "payable",
    inputs: [
      { name:"amountIn",       type:"uint256" },
      { name:"amountOutMin",   type:"uint256" },
      { name:"path",           type:"address[]" },
      { name:"adapters",       type:"address[]" },
    ],
    outputs: []
  },

  // Token -> Native
  {
    type: "function",
    name: "swapNoSplitToAVAX",
    stateMutability: "nonpayable",
    inputs: [
      { name:"amountIn",       type:"uint256" },
      { name:"amountOutMin",   type:"uint256" },
      { name:"path",           type:"address[]" },
      { name:"adapters",       type:"address[]" },
    ],
    outputs: []
  },
] as const;
