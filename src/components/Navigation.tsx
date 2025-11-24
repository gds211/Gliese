import { useLocation, NavLink, Link } from "react-router-dom";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import glieseLogo from "@/assets/gliese-logo.png";
import WalletButton from "@/components/WalletButton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type NavItem = {
  name: string;
  path: string;
  available: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { name: "Swap", path: "/", available: true },
  { name: "Perps", path: "#", available: false },
  { name: "Markets", path: "#", available: false },
  { name: "Stake", path: "#", available: false },
  { name: "Bridge", path: "/bridge", available: true },
];

const Navigation = () => {
  const location = useLocation();

  const activePath = useMemo(() => {
    if (location.pathname === "/") return "/";
    if (location.pathname.startsWith("/bridge")) return "/bridge";
    return location.pathname;
  }, [location.pathname]);

  return (
    <nav className="flex items-center justify-between px-4 py-4 md:px-8">
      <div className="flex items-center gap-6">
        <Link to="/" className="flex items-center gap-2">
          <img
            src={glieseLogo}
            alt="Gliese"
            className="h-8 w-8 rounded-full border border-white/10"
          />
          <span className="hidden text-lg font-semibold tracking-tight text-white sm:inline">
            Gliese
          </span>
        </Link>

        <div className="flex items-center gap-1 rounded-full bg-white/5 p-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.available && item.path !== "#" && activePath === item.path;

            const button = (
              <Button
                key={item.name}
                variant={isActive ? "default" : "ghost"}
                size="sm"
                className={`rounded-full px-3 py-1 text-xs md:px-4 md:text-sm ${
                  !item.available ? "cursor-not-allowed opacity-60" : ""
                }`}
                asChild={item.available && item.path !== "#"}
              >
                {item.available && item.path !== "#" ? (
                  <NavLink to={item.path}>{item.name}</NavLink>
                ) : (
                  <span>{item.name}</span>
                )}
              </Button>
            );

            // For disabled items, show a tooltip saying "Coming soon"
            if (!item.available && item.path === "#") {
              return (
                <Tooltip key={item.name}>
                  <TooltipTrigger asChild>{button}</TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs text-muted-foreground">
                      Coming soon
                    </p>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return button;
          })}
        </div>
      </div>

      <WalletButton />
    </nav>
  );
};

export default Navigation;
