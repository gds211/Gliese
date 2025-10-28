// src/lib/swap.ts
import type { Address, Hash } from "viem";
import {
  getAccount,
  writeContract,
  waitForTransactionReceipt,
} from "wagmi/actions";
import { config } from "@/config/wagmi";
import { ERC20_ABI } from "@/abi/erc20";
import { YAK_ROUTER_ABI } from "@/abi/yakRouter";
import { YAK_SPLIT_EXECUTOR_ABI } from "@/abi/yakSplitExecutor";
import { PUBLIC_CONFIG } from "@/config/public";
import type { SplitPlan, YakTrade } from "@/hooks/useYakSplitQuote";

const ZERO: Address = "0x0000000000000000000000000000000000000000";
const isNative = (s?: string) =>
  !s || s.toUpperCase() === PUBLIC_CONFIG.NATIVE_SYMBOL || s === ZERO;

const MAX_UINT = 2n ** 256n - 1n;

// Pulls allowance logic out for re-use
async function ensureAllowance(token: Address, owner: Address, spender: Address, amount: bigint) {
  const { readContract, writeContract, waitForTransactionReceipt } = await import("wagmi/actions");
  const current: bigint = await readContract(config, {
    address: token,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [owner, spender],
  }) as bigint;

  if (current >= amount) return;

  // Set exact allowance to be conservative (or MAX_UINT if you prefer UX)
  let hash: Hash = await writeContract(config, {
    address: token, abi: ERC20_ABI, functionName: "approve", args: [spender, 0n],
  });
  await waitForTransactionReceipt(config, { hash });

  hash = await writeContract(config, {
    address: token, abi: ERC20_ABI, functionName: "approve", args: [spender, amount],
  });
  await waitForTransactionReceipt(config, { hash });
}

export async function executeSwap(args: {
  plan: SplitPlan;                // best plan from useYakSplitQuote
  tokenIn: Address | string;
  tokenOut: Address | string;
  unwrapNativeOut?: boolean;      // if true and tokenOut==WNATIVE → unwrap to native
  feeBps?: number;                // will be clamped by router.MIN_FEE in the executor
}): Promise<{ hash: Hash }> {
  const { address } = getAccount(config);
  if (!address) throw new Error("Wallet not connected");

  const router = PUBLIC_CONFIG.YAK_ROUTER as Address;
  const executor = PUBLIC_CONFIG.SPLIT_EXECUTOR as Address;
  if (!router) throw new Error("Missing PUBLIC_CONFIG.YAK_ROUTER");
  if (!executor) throw new Error("Missing PUBLIC_CONFIG.SPLIT_EXECUTOR");

  const wnative = PUBLIC_CONFIG.WRAPPED_NATIVE as Address;
  const isInNative = isNative(args.tokenIn as string);
  const isOutNative = isNative(args.tokenOut as string);
  const unwrapOut = !!args.unwrapNativeOut && isOutNative;

  const FEE_BPS = BigInt(args.feeBps ?? (PUBLIC_CONFIG.QUOTE?.FEE_BPS ?? 0));

  // Calculate totals
  const totalIn = args.plan.legs.reduce((acc, l) => acc + l.amountIn, 0n);
  const trades: YakTrade[] = args.plan.legs.map(l => l.trade);

  if (isInNative) {
    // Native-in path uses splitSwapNative (msg.value == totalIn). Each trade.path[0] must be WNATIVE.
    const txHash = await writeContract(config, {
      account: address,
      address: executor,
      abi: YAK_SPLIT_EXECUTOR_ABI,
      functionName: "splitSwapNative",
      args: [trades, address, FEE_BPS, args.plan.totalAmountOut, unwrapOut],
      value: totalIn,
    });
    return { hash: txHash };
  }

  // ERC20-in: ensure allowance to the executor (not the router)
  const tokenInAddr = args.plan.legs[0].offer.path[0] as Address;
  await ensureAllowance(tokenInAddr, address, executor, totalIn);

  const txHash = await writeContract(config, {
    account: address,
    address: executor,
    abi: YAK_SPLIT_EXECUTOR_ABI,
    functionName: "splitSwapERC20",
    args: [trades, address, FEE_BPS, args.plan.totalAmountOut, unwrapOut],
  });

  return { hash: txHash };
}
