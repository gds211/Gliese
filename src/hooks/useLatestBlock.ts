import { useBlockNumber } from 'wagmi';
import { useEffect, useState } from 'react';

export const useLatestBlock = () => {
  const { data: blockNumber, isError, isLoading } = useBlockNumber({
    watch: true,
  });
  
  const [displayBlock, setDisplayBlock] = useState<bigint | undefined>(blockNumber);

  useEffect(() => {
    if (blockNumber) {
      setDisplayBlock(blockNumber);
    }
  }, [blockNumber]);

  return {
    blockNumber: displayBlock,
    isError,
    isLoading,
  };
};