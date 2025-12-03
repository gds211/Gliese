import { Button } from "@/components/ui/button";
import { useState } from "react";
import glieseLogo from "@/assets/gliese-logo.png";
import WalletButton from "@/components/WalletButton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface NavigationProps {
  onNavChange?: (section: "Swap" | "Bridge") => void;
}

const Navigation = ({ onNavChange }: NavigationProps) => {
  const [activeTab, setActiveTab] = useState("Swap");

  const handleTabClick = (name: string) => {
    setActiveTab(name);
    if (onNavChange && (name === "Swap" || name === "Bridge")) {
      onNavChange(name);
    }
  };

  const navItems = [
    { name: "Swap", href: "#", available: true },
    { name: "Explore", href: "#", available: false },
    { name: "Perps", href: "#", available: false },
    { name: "Markets", href: "#", available: false },
    { name: "Bridge", href: "#", available: true },
  ];

  return (
    <nav className="flex items-center justify-between px-6 py-4 backdrop-blur-sm border-b-[0.3px] border-border">
      {/* Logo */}
      <div className="flex items-center gap-3 -translate-y-0.5">
        <img
          src={glieseLogo}
          alt="Gliese"
          className="w-8 h-8 rounded-full shadow-glow-cosmic"
        />
        <span className="text-xl font-bold text-foreground">GLIESE</span>
      </div>

      {/* Navigation Links */}
      <div className="flex items-center gap-1 bg-black rounded-lg p-1 backdrop-blur-sm">
          {navItems.map((item) => {
            const button = (
              <Button
                key={item.name}
                variant={activeTab === item.name ? "default" : "ghost"}
                size="sm"
                onClick={() => item.available && handleTabClick(item.name)}
                disabled={!item.available}
                className={`
                  px-4 py-2 transition-all duration-300
                  ${!item.available && "opacity-50 cursor-not-allowed"}
                  ${
                    activeTab === item.name
                      ? "bg-primary text-primary-foreground shadow-glow-cosmic"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
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
