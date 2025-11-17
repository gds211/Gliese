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
    // Minimize background refetches while keeping UI fresh on user actions.
    // We do not `watch` here to avoid per-block RPCs; swaps explicitly call `refetch()`.
    query: {
      enabled: Boolean(address) && Boolean(token),
      staleTime: 30_000,           // 30s: keeps balance "fresh enough" but avoids duplicate mounts
      gcTime: 5 * 60_000,          // 5m: retain data to dedupe navigations
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
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
