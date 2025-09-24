// src/lib/swap.ts
import type { Address, Hash } from "viem";
import {
  getAccount,
  getPublicClient,
  writeContract,
  waitForTransactionReceipt,
} from "wagmi/actions";
import { config } from "@/config/wagmi";
import { ERC20_ABI } from "@/abi/erc20";
import { YAK_ROUTER_ABI } from "@/abi/yakRouter";
import { PUBLIC_CONFIG } from "@/config/public";

export type SwapArgs = {
  router: Address;
  tokenIn?: string;   // "MON" or address
  tokenOut?: string;  // symbol or address
  amountIn: bigint;
  amountOutMin: bigint;
  path: Address[];
  adapters: Address[];
};

// local helpers
const ZERO = "0x0000000000000000000000000000000000000000" as Address;
const isNative = (v?: string) =>
  !v || v.toUpperCase() === PUBLIC_CONFIG.NATIVE_SYMBOL || v === ZERO;
const toQuoteAddr = (v?: string) =>
  (isNative(v) ? (PUBLIC_CONFIG.WRAPPED_NATIVE as Address) : (v as Address));

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

  const inIsNative  = isNative(args.tokenIn);
  const outIsNative = isNative(args.tokenOut);

  const tokenInAddr  = toQuoteAddr(args.tokenIn) as Address;

  if (!args.path?.length || args.adapters?.length !== args.path.length - 1) {
    throw new Error("Invalid route (path/adapters mismatch).");
  }

  if (!inIsNative) {
    await ensureAllowance(client, tokenInAddr, address, router, args.amountIn);
  }

  // Build Trade struct
  const trade = {
    amountIn:  args.amountIn,
    amountOut: args.amountOutMin, // minOut (slippage already applied)
    path:      args.path,
    adapters:  args.adapters,
  } as const;

  // Fee in bps (1e4 denominator). Your UI shows 0.02% → 2 bps.
  // If your router MIN_FEE is higher, raise this number.
  const FEE_BPS = 2n;

  const base = {
    account: address,
    address: router,
    abi: YAK_ROUTER_ABI,
  } as const;

  let txHash: Hash;

  if (inIsNative && !outIsNative) {
    // Native -> Token
    try {
      txHash = await writeContract(config, {
        ...base,
        functionName: "swapNoSplitFromAVAX",
        args: [trade, address, FEE_BPS],
        value: args.amountIn,
      });
    } catch {
      // fallback to lowercase variant
      txHash = await writeContract(config, {
        ...base,
        functionName: "swapNoSplitFromAvax",
        args: [trade, address, FEE_BPS],
        value: args.amountIn,
      });
    }
  } else if (!inIsNative && outIsNative) {
    // Token -> Native
    txHash = await writeContract(config, {
      ...base,
      functionName: "swapNoSplitToAVAX",
      args: [trade, address, FEE_BPS],
    });
  } else {
    // Token -> Token
    txHash = await writeContract(config, {
      ...base,
      functionName: "swapNoSplit",
      args: [trade, address, FEE_BPS],
    });
  }

  const receipt = await waitForTransactionReceipt(config, { hash: txHash });
  return receipt;
}


