import { useState, useEffect, useRef, useCallback } from "react";

interface Quote {
  amountOut: string;
  amountOutMin: string;
  priceImpact: number;
  fee: string;
}

interface UseQuoteParams {
  sellToken: string;
  buyToken: string;
  sellAmount: string;
  slippageBps?: number;
  debounceMs?: number;
}

export const useQuote = ({
  sellToken,
  buyToken,
  sellAmount,
  slippageBps = 50, // 0.5%
  debounceMs = 300,
}: UseQuoteParams) => {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getBestQuote = useCallback(async (
    fromToken: string,
    toToken: string,
    amount: string,
    signal: AbortSignal
  ): Promise<Quote> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (signal.aborted) {
      throw new Error("Request aborted");
    }

    // Mock calculation
    const mockAmountOut = (parseFloat(amount) * 0.00215).toFixed(6);
    const amountOutMin = (parseFloat(mockAmountOut) * (1 - slippageBps / 10_000)).toFixed(6);
    
    return {
      amountOut: mockAmountOut,
      amountOutMin,
      priceImpact: 0.1,
      fee: "0.02",
    };
  }, [slippageBps]);

  const fetchQuote = useCallback(() => {
    if (!sellAmount || parseFloat(sellAmount) <= 0 || sellToken === buyToken) {
      setQuote(null);
      setError(null);
      setLoading(false);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Setup debounced request
    timeoutRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const newQuote = await getBestQuote(sellToken, buyToken, sellAmount, controller.signal);
        if (!controller.signal.aborted) {
          setQuote(newQuote);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Failed to get quote");
          setQuote(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, debounceMs);
  }, [sellToken, buyToken, sellAmount, getBestQuote, debounceMs]);

  useEffect(() => {
    fetchQuote();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [fetchQuote]);

  return {
    quote,
    loading,
    error,
    refetch: fetchQuote,
  };
};