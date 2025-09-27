// src/pages/Index.tsx
import SwapInterface from "@/components/SwapInterface";
import cosmicBackground from "@/assets/cosmic-background.jpg";

const Index = () => {
  return (
    // Fill available height provided by <main> without exceeding viewport
    <div className="relative min-h-full">
      {/* Background layer */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${cosmicBackground})` }}
      />
      {/* Optional blur/overlay */}
      <div className="absolute inset-0 bg-background/20 backdrop-blur-[1px]" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 py-8">
        {/* Center as you like; avoid adding another min-h-screen */}
        <div className="mx-auto max-w-3xl">
          <SwapInterface />
        </div>
      </div>
    </div>
  );
};

export default Index;

