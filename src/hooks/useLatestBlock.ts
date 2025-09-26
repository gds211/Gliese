// src/hooks/useLatestBlock.ts
import { useEffect, useState } from "react";
import { useChainId, usePublicClient } from "wagmi";

/**
 * Polls the RPC for the latest block number.
 * - Uses viem's watchBlockNumber with poll=true so it works over HTTP.
 * - Clears error automatically on any successful tick.
 */
export function useLatestBlock(pollingInterval = 10_000) { // 10s default
  const publicClient = usePublicClient();
  const chainId = useChainId();

  const [blockNumber, setBlockNumber] = useState<bigint | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!publicClient) return;

    let stop: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      try {
        const n = await publicClient.getBlockNumber();
        if (!cancelled) {
          setBlockNumber(n);
          setError(null); // clear any previous error
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }

      try {
        stop = publicClient.watchBlockNumber({
          onBlockNumber: (n) => {
            if (cancelled) return;
            setBlockNumber((prev) => (prev === n ? prev : n));
            setError(null); // success -> clear error
          },
          onError: (e) => {
            if (!cancelled) setError(e.message);
          },
          emitOnBegin: false,
          poll: true,               // HTTP-safe
          pollingInterval,          // 10s
        });
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();

    return () => {
      cancelled = true;
      if (stop) stop();
    };
  }, [publicClient, chainId, pollingInterval]);

  return { blockNumber, error };
}
