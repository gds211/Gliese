import { useLatestBlock } from "@/hooks/useLatestBlock";

type Props = {
  className?: string;
  pollingMs?: number;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
};

export default function BlockIndicatorOverlay({
  className = "",
  pollingMs = 10_000,
  position = "top-right",
}: Props) {
  const { blockNumber, error } = useLatestBlock(pollingMs);
  const isError = Boolean(error);

  const positionClasses = {
    "top-left": "top-4 left-4",
    "top-right": "top-4 right-4",
    "bottom-left": "bottom-4 left-4",
    "bottom-right": "bottom-4 right-4",
  };

  return (
    <div
      className={`fixed z-50 ${positionClasses[position]} ${className}`}
      title={isError ? error ?? "RPC error" : `Block ${blockNumber}`}
    >
      <div className="flex items-center gap-2 px-3 py-2 bg-background/90 border border-border/50 rounded-lg backdrop-blur-sm shadow-lg">
        {/* Status indicator */}
        <div className="relative flex items-center justify-center">
          <div
            className={`h-2 w-2 rounded-full ${
              isError ? "bg-destructive" : "bg-primary animate-pulse"
            }`}
          />
        </div>

        {/* Block number */}
        <span className="text-sm font-mono text-foreground/80">
          {blockNumber !== null ? `#${blockNumber.toString()}` : "—"}
        </span>

        {/* Error indicator */}
        {isError && (
          <span className="text-xs text-destructive font-medium">
            ERROR
          </span>
        )}
      </div>
    </div>
  );
}