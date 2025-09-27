import LatestBlockIndicator from "@/components/LatestBlockIndicator";

/**
 * Fixed, minimal overlay at the very bottom.
 * Left padding matches Navigation (px-6) and common container width (max-w-6xl).
 * No logo/text rendered here — ONLY the indicator.
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
