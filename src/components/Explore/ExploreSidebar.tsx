// src/components/Explore/ExploreSidebar.tsx
import { cn } from "@/lib/utils";
import { Flame, TrendingUp, BarChart3, Star, Clock, Settings, HelpCircle } from "lucide-react";
import glieseLogo from "@/assets/gliese-logo.png";

export type ExploreView = "trending" | "top_traded" | "gainers" | "new" | "watchlist";

interface ExploreSidebarProps {
  activeView: ExploreView;
  onViewChange: (view: ExploreView) => void;
  className?: string;
}

const navItems: { icon: typeof Flame; label: string; value: ExploreView }[] = [
  { icon: Flame, label: "Trending", value: "trending" },
  { icon: BarChart3, label: "Top Traded", value: "top_traded" },
  { icon: TrendingUp, label: "Gainers", value: "gainers" },
  { icon: Clock, label: "New Tokens", value: "new" },
  { icon: Star, label: "Watchlist", value: "watchlist" },
];

export default function ExploreSidebar({ activeView, onViewChange, className }: ExploreSidebarProps) {
  return (
    <div className={cn(
      "flex flex-col h-full",
      className
    )}>
      {/* Logo */}
      <div className="p-4 mb-4">
        <img src={glieseLogo} alt="Gliese" className="h-8 w-auto" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2">
        <div className="text-[10px] font-semibold text-white/30 uppercase tracking-wider px-3 mb-2">
          Discover
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.value;
          return (
            <button
              key={item.value}
              onClick={() => onViewChange(item.value)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all duration-200",
                "text-sm font-medium",
                isActive 
                  ? "bg-emerald-500/20 text-emerald-400 border-l-2 border-emerald-400" 
                  : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              <Icon className={cn("w-4 h-4", isActive && "text-emerald-400")} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="px-2 pb-4 border-t border-white/5 pt-4 mt-4">
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/40 hover:text-white/60 hover:bg-white/5 transition-all text-sm">
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-white/40 hover:text-white/60 hover:bg-white/5 transition-all text-sm">
          <HelpCircle className="w-4 h-4" />
          <span>Help</span>
        </button>
      </div>
    </div>
  );
}
