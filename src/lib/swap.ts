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

// Back‑compat single‑route swap used by SwapInterface.tsx
// Matches the call signature used in the component.
export async function performSwap(args: {
  router: Address | string;
  tokenIn: Address | string;   // address or native symbol (e.g., "MON")
  tokenOut: Address | string;  // not required for execution; end of path is authoritative
  amountIn: bigint;
  amountOutMin: bigint;
  path: Address[];
  adapters: Address[];
}) {
  const { address } = getAccount(config);
  if (!address) throw new Error("Wallet not connected");

  // Build the Yak trade tuple used by the router
  const trade: YakTrade = {
    amountIn: args.amountIn,
    amountOut: args.amountOutMin,
    path: args.path,
    adapters: args.adapters,
  };

  // Use the same effective fee logic as your quotes
  const feeBps = await getEffectiveFeeBps();

  if (isNative(args.tokenIn as string)) {
    // Native-in: first hop MUST be WRAPPED_NATIVE
    const wnative = (PUBLIC_CONFIG.WRAPPED_NATIVE as string).toLowerCase();
    if (!args.path?.length || args.path[0].toLowerCase() !== wnative) {
      throw new Error("Invalid path for native input: first hop must be WRAPPED_NATIVE.");
    }

    const hash = await writeContract(config, {
      account: address,
      address: args.router as Address,
      abi: YAK_ROUTER_ABI,
      functionName: "swapNoSplitFromAVAX",
      args: [trade, address, feeBps],
      value: args.amountIn, // msg.value == amountIn for native flow
    });

    // return full receipt (UI uses .transactionHash)
    return await waitForTransactionReceipt(config, { hash });
  } else {
    // ERC20-in: ensure allowance to the ROUTER (not the split executor)
    const token = args.tokenIn as Address;
    const current = (await readContract(config, {
      address: token,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [address, args.router as Address],
    })) as bigint;

    if (current < args.amountIn) {
      // Approve safely (zero then set) to handle non‑standard ERC‑20s
      let hash = await writeContract(config, {
        account: address,
        address: token,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [args.router as Address, 0n],
      });
      await waitForTransactionReceipt(config, { hash });

      hash = await writeContract(config, {
        account: address,
        address: token,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [args.router as Address, args.amountIn],
      });
      await waitForTransactionReceipt(config, { hash });
    }

    const hash = await writeContract(config, {
      account: address,
      address: args.router as Address,
      abi: YAK_ROUTER_ABI,
      functionName: "swapNoSplit",
      args: [trade, address, feeBps],
    });

    return await waitForTransactionReceipt(config, { hash });
  }
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
