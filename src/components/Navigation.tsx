import { Button } from "@/components/ui/button";
import { useState } from "react";
import glieseLogo from "@/assets/gliese-logo.png";
import WalletButton from "@/components/WalletButton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface NavigationProps {
  onNavChange?: (section: "Swap" | "Bridge" | "Explore") => void;
  onNavPending?: (section: "Swap" | "Bridge" | "Explore") => void;
  currentSection?: "Swap" | "Bridge" | "Explore";
  pendingSection?: "Swap" | "Bridge" | "Explore" | null;
}

const Navigation = ({ onNavChange, onNavPending, currentSection = "Swap", pendingSection }: NavigationProps) => {
  // Use pendingSection for visual highlight, otherwise currentSection
  const activeTab = pendingSection || currentSection;

  const handleTabClick = (name: string) => {
    if (name === currentSection) return; // Already on this tab
    if (onNavPending && (name === "Swap" || name === "Bridge" || name === "Explore")) {
      onNavPending(name);
    }
  };

  const navItems = [
    { name: "Swap", href: "#", available: true },
    { name: "Explore", href: "#", available: true },
    { name: "Perps", href: "#", available: false },
    { name: "Markets", href: "#", available: false },
    { name: "Bridge", href: "#", available: true },
  ];

  return (
    <nav className="relative flex items-center justify-between px-6 py-4 backdrop-blur-sm border-b-[0.3px] border-border">
      {/* Logo */}
      <div className="flex items-center gap-3 -translate-y-0.5">
        <img
          src={glieseLogo}
          alt="Gliese"
          className="w-8 h-8 rounded-full shadow-glow-cosmic"
        />
        <span className="text-xl font-medium text-foreground" style={{ fontFamily: 'Inter, sans-serif' }}>Gliese</span>
      </div>

      {/* Navigation Links */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/80 rounded-full px-2 py-1.5 backdrop-blur-sm border border-white/10">
          {navItems.map((item) => {
            const button = (
              <Button
                key={item.name}
                variant={activeTab === item.name ? "default" : "ghost"}
                size="sm"
                onClick={() => item.available && handleTabClick(item.name)}
                disabled={!item.available}
                className={`
                  px-5 py-1.5 rounded-full transition-all duration-300
                  ${!item.available && "opacity-50 cursor-not-allowed"}
                  ${
                    activeTab === item.name
                      ? "bg-primary text-primary-foreground shadow-glow-cosmic"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/10"
                  }
                `}
              >
                {item.name}
              </Button>
            );

            if (!item.available) {
              return (
                <Tooltip key={item.name}>
                  <TooltipTrigger asChild>
                    {button}
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Under Construction</p>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return button;
          })}
        </div>

      {/* Connect Wallet (RainbowKit modal pops from this custom button) */}
      <WalletButton />
    </nav>
  );
};

export default Navigation;
