import { useLatestBlock } from '@/hooks/useLatestBlock';
import { Activity } from 'lucide-react';

const LatestBlockIndicator = () => {
  const { blockNumber, isLoading, isError } = useLatestBlock();

  if (isError) {
    return (
      <div className="flex items-center gap-2 text-destructive text-sm">
        <Activity className="w-3 h-3" />
        <span>Block Error</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-muted-foreground text-sm">
      <Activity className={`w-3 h-3 ${isLoading ? 'animate-pulse' : ''}`} />
      <span>
        Block: {isLoading ? '...' : blockNumber?.toString() || 'N/A'}
      </span>
    </div>
  );
};

export default LatestBlockIndicator;