import Navigation from "@/components/Navigation";
import BlockIndicatorOverlay from "@/components/BlockIndicatorOverlay";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const App = () => (
  <TooltipProvider delayDuration={150}>
    <Toaster />
    <Sonner />
    <BrowserRouter>
      {/* Use dvh to avoid mobile URL-bar issues. Prevent horizontal scroll. */}
      <div className="min-h-dvh flex flex-col bg-background overflow-x-hidden">
        {/* Render the navbar ONCE, globally */}
        <Navigation />

        {/* Routed pages fill remaining height */}
        <main className="flex-1 min-h-0">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>

        {/* Tiny, fixed, bottom indicator (no footer, no branding) */}
        <BlockIndicatorOverlay />
      </div>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;



