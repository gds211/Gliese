import { useBalance } from 'wagmi';
import { Address } from 'viem';

interface UseTokenBalanceProps {
  address?: Address;
  token?: Address;
}

export const useTokenBalance = ({ address, token }: UseTokenBalanceProps) => {
  const { data, isError, isLoading, refetch } = useBalance({
    address,
    token,
  });

  return {
    balance: data,
    formatted: data?.formatted,
    symbol: data?.symbol,
    decimals: data?.decimals,
    isError,
    isLoading,
    refetch,
  };
};