import { useQueries } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { getBalanceQueryOptions } from 'wagmi/query';
import { Address } from 'viem';
import { PUBLIC_CONFIG } from '@/config/public';
import { wagmiConfig } from '@/lib/wagmiConfig';

interface Token {
  address?: string;
  symbol: string;
}

export const useMultiTokenBalances = (tokens: Token[]) => {
  const { address, isConnected } = useAccount();

  // Pre-fetch balances for all tokens in parallel
  const balanceQueries = useQueries({
    queries: tokens.map((token) => {
      const queryOptions = getBalanceQueryOptions(wagmiConfig, {
        address: address!,
        token: token.address as Address,
        chainId: PUBLIC_CONFIG.CHAIN_ID,
      });

      return {
        ...queryOptions,
        enabled: Boolean(isConnected && address && token.address),
        staleTime: 12_000,
        gcTime: 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      };
    }),
  });

  const isLoading = balanceQueries.some(q => q.isLoading);

  return { 
    isLoading, 
    isConnected,
    balanceQueries,
  };
};
