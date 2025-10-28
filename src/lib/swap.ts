// src/lib/swap.ts
import type { Address, Hash } from "viem";
import {
  getAccount,
  readContract,
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

async function ensureAllowance(token: Address, owner: Address, spender: Address, amount: bigint) {
  const current = await readContract(config, {
    address: token,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [owner, spender],
  }) as bigint;

  if (current >= amount) return;

  // set to zero first (non-standard ERC-20 safety)
  let hash = await writeContract(config, {
    address: token, abi: ERC20_ABI, functionName: "approve", args: [spender, 0n],
  });
  await waitForTransactionReceipt(config, { hash });

  hash = await writeContract(config, {
    address: token, abi: ERC20_ABI, functionName: "approve", args: [spender, amount],
  });
  await waitForTransactionReceipt(config, { hash });
}

// Compute the same effective fee used during quoting
async function getEffectiveFeeBps(): Promise<bigint> {
  const router = PUBLIC_CONFIG.YAK_ROUTER as Address;
  const minFee = await readContract(config, {
    address: router,
    abi: YAK_ROUTER_ABI,
    functionName: "MIN_FEE",
    args: [],
  }) as bigint;
  const cfg = BigInt((PUBLIC_CONFIG as any).QUOTE?.FEE_BPS ?? 0);
  return minFee > cfg ? minFee : cfg;
}

export async function executeSwap(args: {
  plan: SplitPlan;                // best plan from useYakSplitQuote (already fee+slippage adjusted)
  tokenIn: Address | string;
  tokenOut: Address | string;
  unwrapNativeOut?: boolean;      // if true and tokenOut==WNATIVE → unwrap to native
}): Promise<{ hash: Hash }> {
  const { address } = getAccount(config);
  if (!address) throw new Error("Wallet not connected");

  const executor = PUBLIC_CONFIG.SPLIT_EXECUTOR as Address;
  if (!executor) throw new Error("Missing PUBLIC_CONFIG.SPLIT_EXECUTOR");

  const wnative = PUBLIC_CONFIG.WRAPPED_NATIVE as Address;
  const isInNative = isNative(args.tokenIn as string);
  const isOutNative = isNative(args.tokenOut as string);
  const unwrapOut = !!args.unwrapNativeOut && isOutNative;

  // Use the exact same effective fee as the quote
  const FEE_BPS = await getEffectiveFeeBps();

  // Calculate totals
  const totalIn = args.plan.legs.reduce((acc, l) => acc + l.amountIn, 0n);
  const trades: YakTrade[] = args.plan.legs.map(l => l.trade);

  if (isInNative) {
    // Native-in path uses splitSwapNative (msg.value == totalIn). Each trade.path[0] must be WNATIVE.
    const hash = await writeContract(config, {
      account: address,
      address: executor,
      abi: YAK_SPLIT_EXECUTOR_ABI,
      functionName: "splitSwapNative",
      args: [trades, address, FEE_BPS, args.plan.totalAmountOut, unwrapOut],
      value: totalIn,
    });
    return { hash };
  }

  // ERC20-in: ensure allowance to the executor (not the router)
  const tokenInAddr = args.plan.legs[0].offer.path[0] as Address;
  await ensureAllowance(tokenInAddr, address, executor, totalIn);

  const hash = await writeContract(config, {
    account: address,
    address: executor,
    abi: YAK_SPLIT_EXECUTOR_ABI,
    functionName: "splitSwapERC20",
    args: [trades, address, FEE_BPS, args.plan.totalAmountOut, unwrapOut],
  });

  return { hash };
}
