import { Address } from 'viem';
import { wagmiConfig } from '@/web3/wagmi';
import { readContract, writeContract, waitForTransactionReceipt } from 'wagmi/actions';
import IYakRouter from '@/abi/IYakRouter';
import { YAK_ROUTER } from '@/data/contracts';
import { ERC20_ABI } from '@/abi/erc20';

export async function ensureAllowance(opts: { token: Address; owner: Address; spender: Address; required: bigint; }) {
  const current = await readContract(wagmiConfig, {
    address: opts.token, abi: ERC20_ABI, functionName: 'allowance', args: [opts.owner, opts.spender],
  }) as bigint;
  if (current >= opts.required) return null;
  const hash = await writeContract(wagmiConfig, {
    address: opts.token, abi: ERC20_ABI, functionName: 'approve', args: [opts.spender, opts.required],
  });
  await waitForTransactionReceipt(wagmiConfig, { hash });
  return hash;
}

export async function swapNoSplit(opts: {
  amountIn: bigint; amountOutMin: bigint; path: Address[]; adapters: Address[]; recipient: Address; deadline: bigint; value?: bigint;
}): Promise<`0x${string}`> {
  const hash = await writeContract(wagmiConfig, {
    address: YAK_ROUTER,
    abi: IYakRouter,
    functionName: 'swapNoSplit',
    args: [opts.amountIn, opts.amountOutMin, opts.path, opts.adapters, opts.recipient, opts.deadline],
    value: opts.value ?? 0n,
  });
  await waitForTransactionReceipt(wagmiConfig, { hash });
  return hash;
}