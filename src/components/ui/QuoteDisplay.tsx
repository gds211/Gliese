import { Skeleton } from "@/components/ui/skeleton";

interface Quote {
  amountOut: string;
  amountOutMin: string;
  priceImpact: number;
  fee: string;
}

interface QuoteDisplayProps {
  quote: Quote | null;
  loading: boolean;
  error: string | null;
  className?: string;
}

export const QuoteDisplay = ({ quote, loading, error, className }: QuoteDisplayProps) => {
  if (loading) {
    return (
      <div className={className}>
        <Skeleton className="h-12 w-24" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <div className="text-destructive text-sm">
          Quote failed
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className={className}>
        <div className="text-3xl font-semibold text-muted-foreground tabular-nums">
          —
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="text-3xl font-semibold text-foreground tabular-nums">
        {parseFloat(quote.amountOut).toFixed(6)}
      </div>
    </div>
  );
};