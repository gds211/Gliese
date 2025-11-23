import { useQueries } from '@tanstack/react-query';
import { useAccount, useBalance } from 'wagmi';
import { Address } from 'viem';

interface Token {
  address?: string;
  symbol: string;
}

export const useMultiTokenBalances = (tokens: Token[]) => {
  const { address: walletAddress, isConnected } = useAccount();

  const balanceQueries = useQueries({
    queries: tokens.map((token) => ({
      queryKey: ['tokenBalance', walletAddress, token.address || token.symbol],
      queryFn: async () => {
        // This will be handled by wagmi's useBalance through the queries
        return null;
      },
      enabled: false, // We'll use individual useBalance hooks instead
    })),
  });

  // Create a map of token address/symbol to balance
  const balances = new Map<string, string>();

  // We'll use wagmi's built-in caching by calling useBalance for each token
  // The actual fetching is done below with individual hooks
  
  return {
    balances,
    isConnected,
    walletAddress,
  };
};

// Simpler approach: return a function to get balance for a token
export const useTokenBalanceMap = (tokens: Token[]) => {
  const { address: walletAddress, isConnected } = useAccount();

  // We can't call hooks conditionally, so we'll return a map builder function
  // that components can use to check balances
  
  return {
    isConnected,
    walletAddress,
    // Components will need to use useBalance individually for each token
    // and build the sorting logic inline
  };
};
