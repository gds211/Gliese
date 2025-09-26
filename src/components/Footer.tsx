// src/components/Footer.tsx
import glieseLogo from "@/assets/gliese-logo.png";
import LatestBlockIndicator from "@/components/LatestBlockIndicator";

export default function Footer() {
  return (
    <footer className="w-full px-6 py-4 border-t border-border/20 mt-auto">
      <div className="mx-auto max-w-6xl flex items-center justify-between">
        {/* Left group: logo + "Gliese" + tiny indicator (same baseline) */}
        <div className="flex items-center gap-2 text-foreground/80 leading-none">
          <img src={glieseLogo} alt="Gliese" className="h-5 w-5 rounded" />
          <span className="font-medium tracking-tight text-sm">Gliese</span>
          <span className="text-foreground/50" aria-hidden>•</span>

          {/* Tiny indicator; lightweight 10s polling */}
          <LatestBlockIndicator size="xs" pollingMs={10_000} />
        </div>

        {/* Right side (optional): links, version, etc. */}
        <div />
      </div>
    </footer>
  );
}
