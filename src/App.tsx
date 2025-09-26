import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const App = () => (
  <TooltipProvider delayDuration={150}>
    {/* Global toasts */}
    <Toaster />
    <Sonner />

    {/* Router + Layout */}
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-background">
        {/* Top navigation */}
        <Navigation />

        {/* Page content */}
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Index />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>

        {/* Sticky bottom footer (has the Latest Block indicator inline with logo) */}
        <Footer />
      </div>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;


