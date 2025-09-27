import { useEffect, useState } from "react";
import { useLatestBlock } from "@/hooks/useLatestBlock";

export default function BlockIndicatorOverlay() {
  // Align under the actual Gliese brand in the navbar
  const [left, setLeft] = useState<number>(24);

  // Poll latest block every 10s
  const { blockNumber } = useLatestBlock(10000);

  useEffect(() => {
    const compute = () => {
      const el =
        document.getElementById("gliese-text") ||
        document.getElementById("gliese-logo-anchor");
      if (!el) {
        setLeft(24);
        return;
      }
      const rect = el.getBoundingClientRect();
      setLeft(Math.round(rect.left));
    };

    compute();
    window.addEventListener("resize", compute);
    window.addEventListener("orientationchange", compute);
    const t = setInterval(compute, 1500);
    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("orientationchange", compute);
      clearInterval(t);
    };
  }, []);

  return (
    <>
      {/* Local blink keyframes (no new CSS file) */}
      <style>{`
        @keyframes gliese-blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0.25; }
        }
        .gliese-blink { animation: gliese-blink 1s infinite steps(2, start); }
      `}</style>

      <div
        className="fixed bottom-4 z-50 pointer-events-none select-none"
        style={{ left }}
        aria-label="Latest block indicator"
      >
        {/* No surrounding frame/pill — just dot + number */}
        <div className="flex items-center gap-2">
          {/* Black circle with blinking white dot inside */}
          <span className="relative inline-block h-4 w-4 rounded-full bg-black">
            <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white gliese-blink" />
          </span>

          <span className="text-xs font-medium tabular-nums tracking-tight text-white/90">
            {blockNumber ? blockNumber.toString() : "—"}
          </span>
        </div>
      </div>
    </>
  );
}

