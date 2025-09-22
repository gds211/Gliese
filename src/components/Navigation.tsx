import { Button } from "@/components/ui/button";
import { useState } from "react";
import glieseLogo from "@/assets/gliese-logo.png";
import WalletButton from "@/components/WalletButton"; // ⟵ use your custom RK-powered button

const Navigation = () => {
  const [activeTab, setActiveTab] = useState("Swap");

  const navItems = [
    { name: "Swap", href: "#" },
    { name: "Perps", href: "#" },
    { name: "Markets", href: "#" },
    { name: "Stake", href: "#" },
    { name: "Bridge", href: "#" },
  ];

  return (
    <nav className="flex items-center justify-between px-6 py-4 backdrop-blur-sm border-b border-border/20">
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
      <div className="flex items-center gap-1 bg-card/70 rounded-lg p-1 backdrop-blur-sm">
        {navItems.map((item) => (
          <Button
            key={item.name}
            variant={activeTab === item.name ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab(item.name)}
            className={`
              px-4 py-2 transition-all duration-300
              ${
                activeTab === item.name
                  ? "bg-primary text-primary-foreground shadow-glow-cosmic"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }
            `}
          >
            {item.name}
          </Button>
        ))}
      </div>

      {/* Connect Wallet (RainbowKit modal pops from this custom button) */}
      <WalletButton />
    </nav>
  );
};

export default Navigation;
