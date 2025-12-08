import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import SwapInterface from "@/components/SwapInterface";
import BridgeInterface from "@/components/BridgeInterface";
import ExploreInterface from "@/components/ExploreInterface";
import EmptyCard from "@/components/EmptyCard";
import cosmicBackground from "@/assets/cosmic-background.jpg";
import bridgeIcon from "@/assets/bridge-icon.svg";
import wormholeLogo from "@/assets/wormhole-logo.svg";

const Index = () => {
  const [navSection, setNavSection] = useState<"Swap" | "Bridge" | "Explore">("Swap");
  const [activeTab, setActiveTab] = useState<"instant" | "trigger" | "recurring">("instant");
  const [showPanel, setShowPanel] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // Preload bridge assets for instant display when switching tabs
  useEffect(() => {
    const preloadImages = [bridgeIcon, wormholeLogo];
    preloadImages.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  useEffect(() => {
    if (navSection === "Swap" && activeTab === "trigger") {
      setShowPanel(true);
      setIsExiting(false);
    } else if (showPanel) {
      setIsExiting(true);
      const timer = setTimeout(() => {
        setShowPanel(false);
        setIsExiting(false);
      }, 400);
      
      return () => clearTimeout(timer);
    }
  }, [navSection, activeTab, showPanel]);

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
        <Navigation onNavChange={setNavSection} />
        
        {/* Main Content Area */}
        <div className="flex justify-center items-start pt-[calc(50vh-300px)] min-h-[calc(100vh-80px)]">
          {navSection === "Swap" ? (
            <div className="relative">
              {/* Main Swap Card - always in the same position */}
              <SwapInterface 
                activeTab={activeTab} 
                onTabChange={setActiveTab}
              />
              
              {/* Empty Card - appears to the right when Trigger is active */}
              {showPanel && (
                <div className={`absolute left-[calc(100%+16px)] top-0 ${
                  isExiting ? 'animate-slide-out-bottom' : 'animate-slide-in-bottom'
                }`}>
                  <EmptyCard />
                </div>
              )}
            </div>
          ) : navSection === "Bridge" ? (
            <BridgeInterface />
          ) : null}
        </div>
        
        {/* Explore Interface - Liquid Glass Overlay */}
        {navSection === "Explore" && <ExploreInterface />}
      </div>
    </div>
  );
};

export default Index;
