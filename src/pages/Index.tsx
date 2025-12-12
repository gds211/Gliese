import { useState, useEffect, useCallback } from "react";
import Navigation from "@/components/Navigation";
import SwapInterface from "@/components/SwapInterface";
import BridgeInterface from "@/components/BridgeInterface";
import ExploreInterface from "@/components/ExploreInterface";
import EmptyCard from "@/components/EmptyCard";
import TopLoadingBar from "@/components/TopLoadingBar";
import cosmicBackground from "@/assets/cosmic-background.jpg";
import bridgeIcon from "@/assets/bridge-icon.svg";
import wormholeLogo from "@/assets/wormhole-logo.svg";

// Loading bar durations
const MAIN_NAV_LOADING_DURATION = 400;
const INNER_TAB_LOADING_DURATION = 250;

const Index = () => {
  const [navSection, setNavSection] = useState<"Swap" | "Bridge" | "Explore">("Swap");
  const [pendingSection, setPendingSection] = useState<"Swap" | "Bridge" | "Explore" | null>(null);
  const [isLoadingTab, setIsLoadingTab] = useState(false);
  const [activeTab, setActiveTab] = useState<"instant" | "trigger" | "recurring">("instant");
  const [pendingTab, setPendingTab] = useState<"instant" | "trigger" | "recurring" | null>(null);
  const [isLoadingInnerTab, setIsLoadingInnerTab] = useState(false);
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

  // Derive whether panel should show
  const panelShouldShow = navSection === "Swap" && activeTab === "trigger";

  useEffect(() => {
    if (panelShouldShow) {
      setShowPanel(true);
      setIsExiting(false);
    } else if (showPanel && !isExiting) {
      // Panel is visible and should hide, start exit animation
      setIsExiting(true);
      const timer = setTimeout(() => {
        setShowPanel(false);
        setIsExiting(false);
      }, 400);
      
      return () => clearTimeout(timer);
    }
  }, [panelShouldShow, showPanel, isExiting]);

  // Handle pending navigation
  const handleNavPending = useCallback((section: "Swap" | "Bridge" | "Explore") => {
    if (section === navSection) return;
    setPendingSection(section);
    setIsLoadingTab(true);
  }, [navSection]);

  // Called when loading bar completes
  const handleLoadingComplete = useCallback(() => {
    if (pendingSection) {
      setNavSection(pendingSection);
    }
    setPendingSection(null);
    setIsLoadingTab(false);
  }, [pendingSection]);

  // Handle pending inner tab change
  const handleTabPending = useCallback((tab: "instant" | "trigger" | "recurring") => {
    if (tab === activeTab) return;
    setPendingTab(tab);
    setIsLoadingInnerTab(true);
  }, [activeTab]);

  // Called when inner tab loading bar completes
  const handleInnerTabLoadingComplete = useCallback(() => {
    if (pendingTab) {
      setActiveTab(pendingTab);
    }
    setPendingTab(null);
    setIsLoadingInnerTab(false);
  }, [pendingTab]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Top Loading Bar */}
      <TopLoadingBar 
        isLoading={isLoadingTab || isLoadingInnerTab} 
        onComplete={isLoadingTab ? handleLoadingComplete : handleInnerTabLoadingComplete}
        duration={isLoadingTab ? MAIN_NAV_LOADING_DURATION : INNER_TAB_LOADING_DURATION}
      />
      
      {/* Cosmic Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${cosmicBackground})` }}
      />
      
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-background/20 backdrop-blur-[1px]" />
      
      {/* Content */}
      <div className="relative z-10">
        <Navigation 
          onNavPending={handleNavPending}
          currentSection={navSection}
          pendingSection={pendingSection}
        />
        
        {/* Main Content Area */}
        <div className="flex justify-center items-start pt-[calc(50vh-300px)] min-h-[calc(100vh-80px)]">
          {navSection === "Swap" ? (
            <div className="relative">
              {/* Main Swap Card - always in the same position */}
              <SwapInterface 
                activeTab={activeTab} 
                onTabChange={handleTabPending}
                pendingTab={pendingTab}
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
