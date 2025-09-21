import { Address } from 'viem';
import { wagmiConfig } from '@/web3/wagmi';
import { readContract } from 'wagmi/actions';
import IYakRouter from '@/abi/IYakRouter';
import { YAK_ROUTER } from '@/data/contracts';

export type Quote = {
  amounts: bigint[];
  adapters: Address[];
  path: Address[];
  gasEstimate: bigint;
};

export async function quoteBestPath(p: {
  amountIn: bigint; tokenIn: Address; tokenOut: Address; maxSteps: bigint; gasPriceWei: bigint;
}): Promise<Quote> {
  const res = await readContract(wagmiConfig, {
    address: YAK_ROUTER,
    abi: IYakRouter,
    functionName: 'findBestPathWithGas',
    args: [p.amountIn, p.tokenIn, p.tokenOut, p.maxSteps, p.gasPriceWei],
  });
  return { amounts: res[0] as bigint[], adapters: res[1] as Address[], path: res[2] as Address[], gasEstimate: res[3] as bigint };
}