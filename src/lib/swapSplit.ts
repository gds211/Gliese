// src/lib/swapSplit.ts
import type { Address, Hash } from "viem";
import { getAccount, getPublicClient, writeContract, waitForTransactionReceipt } from "wagmi/actions";
import { config } from "@/config/wagmi";
import { ERC20_ABI } from "@/abi/erc20";

export type SplitWriteArgs = {
  executor: Address;            // deployed YakSplitExecutor
  yakRouter: Address;           // router (not used directly here but kept for symmetry)
  tokenIn: Address | null;      // null => native
  tokenOut: Address | null;     // null => native
  feeBps: bigint;               // >= router.MIN_FEE()
  trades: [
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
      { name: "tokenIn", type: "address" },
      { name: "tokenOut", type: "address" },
      { name: "totalAmountIn", type: "uint256" },
      { name: "minTotalAmountOut", type: "uint256" },
      { name: "recipient", type: "address" },
    ],
    outputs: [],
  },
] as const;

async function ensureAllowance(
  client: any,
  token: Address,
  owner: Address,
  spender: Address,
  needed: bigint
) {
  const current = (await client.readContract({
    abi: ERC20_ABI,
    address: token,
    functionName: "allowance",
    args: [owner, spender],
  })) as bigint;

  if (current < needed) {
    await client.writeContract({
      abi: ERC20_ABI,
      address: token,
      functionName: "approve",
      args: [spender, needed],
      account: owner,
    });
  }
}

export async function swapSplitViaExecutor(args: SplitWriteArgs) {
  const { address } = getAccount(config);
  if (!address) throw new Error("Connect wallet first");

  const client = getPublicClient(config);
  const totalAmountIn = args.trades[0].amountIn + args.trades[1].amountIn;

  // Approve the EXECUTOR (not the router) when ERC-20 input
  if (args.tokenIn) {
    await ensureAllowance(client, args.tokenIn, address, args.executor, totalAmountIn);
  }

  const tradesWire = args.trades.map(t => ({
    amountIn: t.amountIn,
    amountOut: t.minOut,
    path: t.path,
    adapters: t.adapters,
  }));

  const tokenIn  = (args.tokenIn  ?? ("0x0000000000000000000000000000000000000000" as Address));
  const tokenOut = (args.tokenOut ?? ("0x0000000000000000000000000000000000000000" as Address));
  const value = args.tokenIn ? 0n : totalAmountIn;

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
