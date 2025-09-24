// src/lib/swap.ts
import type { Address, Hash } from "viem";
import {
  getAccount,
  getPublicClient,
  writeContract,
  waitForTransactionReceipt,
} from "wagmi/actions";
import { config } from "@/config/wagmi"; // <- IMPORTANT: your app's wagmi config
import { ERC20_ABI } from "@/abi/erc20";
import { YAK_ROUTER_ABI } from "@/abi/yakRouter";
import { isNative, toQuoteAddress } from "@/lib/tokens";

export type SwapArgs = {
  router: Address;
  tokenIn?: string;   // symbol or address ("MON" for native)
  tokenOut?: string;  // symbol or address
  amountIn: bigint;
  amountOutMin: bigint;
  path: Address[];
  adapters: Address[];
};

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

  if (current >= needed) return;

  const hash = (await writeContract(config, {
    account: owner,
    abi: ERC20_ABI,
    address: token,
    functionName: "approve",
    args: [spender, needed],
  })) as Hash;

  await waitForTransactionReceipt(config, { hash });
}

export async function performSwap(args: SwapArgs) {
  const { address } = getAccount(config);
  if (!address) throw new Error("Connect wallet first");

  const client = getPublicClient(config) as any;
  const router = args.router;

  const inIsNative = isNative(args.tokenIn);
  const outIsNative = isNative(args.tokenOut);

  const tokenInAddr = toQuoteAddress(args.tokenIn) as Address;
  // const tokenOutAddr = toQuoteAddress(args.tokenOut) as Address; // not used directly here

  // Sanity checks: adapters and path lengths
  if (!args.path?.length || args.adapters?.length !== args.path.length - 1) {
    throw new Error("Invalid route (path/adapters mismatch).");
  }

  // ERC20 approvals if necessary
  if (!inIsNative) {
    await ensureAllowance(client, tokenInAddr, address, router, args.amountIn);
  }

  // Helper to write with shared options
  const write = (fn: string, fnArgs: readonly unknown[], value?: bigint) =>
    writeContract(config, {
      account: address,
      address: router,
      abi: YAK_ROUTER_ABI,
      functionName: fn as any,
      args: fnArgs as any,
      ...(value != null ? { value } : {}),
    }) as Promise<Hash>;

  let txHash: Hash | undefined;

  try {
    if (inIsNative && !outIsNative) {
      // First try 4-arg signature (some forks have it):
      // swapNoSplitFromAVAX(amountIn, amountOutMin, path, adapters) payable
      try {
        txHash = await write("swapNoSplitFromAVAX", [args.amountIn, args.amountOutMin, args.path, args.adapters], args.amountIn);
      } catch (eA) {
        // Fallback #1: same name, 3-arg signature (amountIn from msg.value)
        try {
          txHash = await write("swapNoSplitFromAVAX", [args.amountOutMin, args.path, args.adapters], args.amountIn);
        } catch (eB) {
          // Fallback #2: lowercase-v variant with 3-arg signature
          txHash = await write("swapNoSplitFromAvax", [args.amountOutMin, args.path, args.adapters], args.amountIn);
        }
      }
    } else if (!inIsNative && outIsNative) {
      // token -> native (usually 4-arg signature with amountIn)
      txHash = await write("swapNoSplitToAVAX", [args.amountIn, args.amountOutMin, args.path, args.adapters]);
    } else {
      // token -> token
      txHash = await write("swapNoSplit", [args.amountIn, args.amountOutMin, args.path, args.adapters]);
    }
  } catch (e) {
    // Bubble up the most relevant error
    throw e;
  }

  if (!txHash) throw new Error("No transaction hash");

  const receipt = await waitForTransactionReceipt(config, { hash: txHash });
  return receipt;
}

