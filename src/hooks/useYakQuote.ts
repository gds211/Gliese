import { useState, useEffect, useCallback } from 'react';
import { useReadContract } from 'wagmi';
import { Address } from 'viem';
import { YAK_ROUTER_ABI } from '@/abi/yakRouter';
import { PUBLIC_CONFIG } from '@/config/public';
import { parseTokenAmount } from '@/lib/decimals';
import { Token } from '@/lib/tokens';

export interface YakQuote {
  amountIn: bigint;
  amountOut: bigint;
  path: readonly Address[];
  adapters: readonly Address[];
}

interface UseYakQuoteProps {
  tokenIn: Token | null;
  tokenOut: Token | null;
  amountIn: string;
  enabled?: boolean;
}

export const useYakQuote = ({
  tokenIn,
  tokenOut,
  amountIn,
  enabled = true
}: UseYakQuoteProps) => {
  const [quote, setQuote] = useState<YakQuote | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  
  const parsedAmountIn = tokenIn 
    ? parseTokenAmount(amountIn, tokenIn.decimals)
    : 0n;
  
  const shouldFetch = enabled && 
    tokenIn && 
    tokenOut && 
    tokenIn.address !== tokenOut.address && 
    parsedAmountIn > 0n;

  const {
    data: quoteData,
    isLoading,
    isError,
    refetch
  } = useReadContract({
    address: PUBLIC_CONFIG.YAK_ROUTER as Address,
    abi: YAK_ROUTER_ABI,
    functionName: 'findBestPath',
    args: shouldFetch ? [
      parsedAmountIn,
      tokenIn!.address,
      tokenOut!.address,
      BigInt(PUBLIC_CONFIG.MAX_STEPS)
    ] : undefined,
    query: {
      enabled: shouldFetch,
      refetchInterval: PUBLIC_CONFIG.QUOTE_POLL_MS,
      staleTime: PUBLIC_CONFIG.QUOTE_POLL_MS / 2,
    }
  });

  // Update quote when data changes
  useEffect(() => {
    if (quoteData) {
      setQuote({
        amountIn: quoteData.amountIn,
        amountOut: quoteData.amountOut,
        path: quoteData.path,
        adapters: quoteData.adapters
      });
    } else {
      setQuote(null);
    }
  }, [quoteData]);

  // Handle polling state
  useEffect(() => {
    if (shouldFetch && !isLoading) {
      setIsPolling(true);
      const interval = setInterval(() => {
        refetch();
      }, PUBLIC_CONFIG.QUOTE_POLL_MS);

      return () => {
        clearInterval(interval);
        setIsPolling(false);
      };
    } else {
      setIsPolling(false);
    }
  }, [shouldFetch, isLoading, refetch]);

  const refreshQuote = useCallback(() => {
    if (shouldFetch) {
      refetch();
    }
  }, [shouldFetch, refetch]);

  return {
    quote,
    isLoading,
    isError,
    isPolling,
    refreshQuote,
    hasQuote: quote !== null && quote.amountOut > 0n
  };
};