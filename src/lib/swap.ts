// src/lib/swap.ts
import { Address, Hash, PublicClient } from "viem";
import { getAccount, getPublicClient, writeContract, waitForTransactionReceipt } from "wagmi/actions";
import { ERC20_ABI } from "@/abi/erc20";
import { YAK_ROUTER_ABI } from "@/abi/yakRouter";
import { PUBLIC_CONFIG } from "@/config/public";
import { isNative, toQuoteAddress } from "@/lib/tokens";

export type SwapArgs = {
  router: Address;
  tokenIn?: string;    // symbol or address
  tokenOut?: string;   // symbol or address
  amountIn: bigint;
  amountOutMin: bigint;
  path: Address[];
  adapters: Address[];
};

async function ensureAllowance(
  client: PublicClient,
  token: Address,
  owner: Address,
  spender: Address,
  needed: bigint
) {
  const current = await client.readContract({
    abi: ERC20_ABI,
    address: token,
    functionName: "allowance",
    args: [owner, spender],
  }) as bigint;

  if (current >= needed) return;

  const hash = await writeContract({
    abi: ERC20_ABI,
    address: token,
    functionName: "approve",
    args: [spender, needed],
  }) as Hash;

  await waitForTransactionReceipt({ hash });
}

export async function performSwap(args: SwapArgs) {
  const { address } = getAccount();
  if (!address) throw new Error("Connect wallet first");

  const client = getPublicClient() as PublicClient;
  const router = args.router;

  const inIsNative  = isNative(args.tokenIn);
  const outIsNative = isNative(args.tokenOut);

  const tokenInAddr  = toQuoteAddress(args.tokenIn)  as Address;
  const tokenOutAddr = toQuoteAddress(args.tokenOut) as Address;

  // Sanity checks: adapters and path lengths
  if (!args.path?.length || args.adapters?.length !== args.path.length - 1) {
    throw new Error("Invalid route (path/adapters mismatch).");
  }

  // ERC20 approvals if necessary
  if (!inIsNative) {
    await ensureAllowance(client, tokenInAddr, address, router, args.amountIn);
  }

  // Decide which swap function to call
  const baseArgs = [args.amountIn, args.amountOutMin, args.path, args.adapters] as const;
  let txHash: Hash | undefined;

  try {
    if (inIsNative && !outIsNative) {
      // Try the common name first
      txHash = await writeContract({
        address: router,
        abi: YAK_ROUTER_ABI,
        functionName: "swapNoSplitFromAVAX",
        args: baseArgs,
        value: args.amountIn,
      }) as Hash;
    } else if (!inIsNative && outIsNative) {
      txHash = await writeContract({
        address: router,
        abi: YAK_ROUTER_ABI,
        functionName: "swapNoSplitToAVAX",
        args: baseArgs,
      }) as Hash;
    } else {
      txHash = await writeContract({
        address: router,
        abi: YAK_ROUTER_ABI,
        functionName: "swapNoSplit",
        args: baseArgs,
      }) as Hash;
    }
  } catch (e1) {
    // Some Yak forks use "swapNoSplitFromAvax" (lowercase v)
    if (inIsNative && !outIsNative) {
      txHash = await writeContract({
        address: router,
        abi: YAK_ROUTER_ABI,
        functionName: "swapNoSplitFromAvax",
        args: baseArgs,
        value: args.amountIn,
      }) as Hash;
    } else {
      throw e1;
    }
  }

  if (!txHash) throw new Error("No transaction hash");

  const receipt = await waitForTransactionReceipt({ hash: txHash });
  return receipt;
}
