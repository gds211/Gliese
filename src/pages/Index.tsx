import { useState } from "react";
import Navigation from "@/components/Navigation";
import SwapInterface from "@/components/SwapInterface";
import EmptyCard from "@/components/EmptyCard";
import cosmicBackground from "@/assets/cosmic-background.jpg";

const Index = () => {
  const [activeTab, setActiveTab] = useState<"instant" | "trigger" | "recurring">("instant");

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Cosmic Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${cosmicBackground})` }}
      />
      
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-background/20 backdrop-blur-[1px]" />
      
      {/* Content */}
      <div className="relative z-10">
        <Navigation />
        
        {/* Main Content Area - SwapInterface stays centered */}
        <div className="flex justify-center items-start pt-[calc(50vh-300px)] min-h-[calc(100vh-80px)]">
          {/* Wrapper with relative positioning */}
          <div className="relative">
            {/* Main Swap Card - always in the same position */}
            <SwapInterface 
              activeTab={activeTab} 
              onTabChange={setActiveTab}
            />
            
            {/* Empty Card - appears to the right when Trigger is active */}
            {activeTab === "trigger" && (
              <div className="absolute left-[calc(100%+16px)] top-0 animate-slide-in-right">
                <EmptyCard />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
