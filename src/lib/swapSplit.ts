// src/lib/swapSplit.ts
import type { Address, Hash } from "viem";
import { config } from "@/config/wagmi";
import { writeContract, waitForTransactionReceipt, getPublicClient, getAccount } from "wagmi/actions";

export type SplitWriteArgs = {
  executor: Address;            // deployed YakSplitExecutor
  yakRouter: Address;           // same as PUBLIC_CONFIG.YAK_ROUTER
  tokenIn: Address | null;      // null => native
  tokenOut: Address | null;     // null => native
  feeBps: bigint;               // >= router.MIN_FEE()
  trades: [                      // two trades
    { amountIn: bigint; minOut: bigint; path: Address[]; adapters: Address[] },
    { amountIn: bigint; minOut: bigint; path: Address[]; adapters: Address[] },
  ];
  minTotalOut: bigint;
};

export const YAK_SPLIT_EXECUTOR_ABI = [
  {
    type: "function",
    name: "splitAndSwap",
    stateMutability: "payable",
    inputs: [
      {
        name: "trades",
        type: "tuple[]",
        components: [
          { name: "amountIn", type: "uint256" },
          { name: "amountOut", type: "uint256" },
          { name: "path", type: "address[]" },
          { name: "adapters", type: "address[]" },
        ],
      },
      { name: "feeBps", type: "uint256" },
      { name: "tokenIn", type: "address" },  // address(0) for native
      { name: "tokenOut", type: "address" }, // address(0) for native
      { name: "totalAmountIn", type: "uint256" },
      { name: "minTotalAmountOut", type: "uint256" },
      { name: "recipient", type: "address" },
    ],
    outputs: [],
  },
] as const;

export async function swapSplitViaExecutor(args: SplitWriteArgs) {
  const { address } = getAccount(config);
  if (!address) throw new Error("Connect wallet first");

  const totalAmountIn = args.trades[0].amountIn + args.trades[1].amountIn;

  const tokenIn  = (args.tokenIn  ?? ("0x0000000000000000000000000000000000000000" as Address));
  const tokenOut = (args.tokenOut ?? ("0x0000000000000000000000000000000000000000" as Address));

  const tradesWire = args.trades.map(t => ({
    amountIn: t.amountIn,
    amountOut: t.minOut,
    path: t.path,
    adapters: t.adapters,
  }));

  const value = tokenIn === "0x0000000000000000000000000000000000000000" ? totalAmountIn : 0n;

  const tx: Hash = await writeContract(config, {
    account: address,
    address: args.executor,
    abi: YAK_SPLIT_EXECUTOR_ABI,
    functionName: "splitAndSwap",
    args: [ tradesWire as any, args.feeBps, tokenIn, tokenOut, totalAmountIn, args.minTotalOut, address ],
    value,
  });

  const rcpt = await waitForTransactionReceipt(config, { hash: tx });
  return rcpt;
}

