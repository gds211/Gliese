import { useEffect, useState } from "react";

interface TopLoadingBarProps {
  isLoading: boolean;
  onComplete: () => void;
  duration?: number;
}

const TopLoadingBar = ({ isLoading, onComplete, duration = 400 }: TopLoadingBarProps) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isLoading) {
      setVisible(true);
      const timer = setTimeout(() => {
        onComplete();
        // Small delay before hiding to let the bar reach 100%
        setTimeout(() => setVisible(false), 50);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isLoading, onComplete, duration]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-1">
      <div 
        className="h-full bg-gradient-to-r from-orange-500 via-orange-400 to-amber-300 shadow-[0_0_20px_rgba(251,146,60,0.8),0_0_40px_rgba(251,146,60,0.4)] animate-loading-bar"
        style={{ animationDuration: `${duration}ms` }}
      />
    </div>
  );
};

export default TopLoadingBar;
