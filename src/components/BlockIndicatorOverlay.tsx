import LatestBlockIndicator from "@/components/LatestBlockIndicator";

/**
 * Fixed, minimal overlay at the bottom of the viewport.
 * Aligned with the same container as the header: max-w-6xl + px-6.
 * Shows ONLY the block indicator (no logo/text).
 */
export default function BlockIndicatorOverlay() {
  return (
    <div className="fixed inset-x-0 bottom-4 z-40 pointer-events-none">
      <div className="mx-auto max-w-6xl px-6">
        <div className="pointer-events-auto">
          <LatestBlockIndicator size="xs" pollingMs={10_000} />
        </div>
      </div>
    </div>
  );
}
