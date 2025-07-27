import Navigation from "@/components/Navigation";
import SwapInterface from "@/components/SwapInterface";
import BlackHoleCursor from "@/components/BlackHoleCursor";
import cosmicBackground from "@/assets/cosmic-background.jpg";

const Index = () => {
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
        
        {/* Main Content Area */}
        <div className="flex items-start justify-center min-h-[calc(100vh-80px)] pt-32">
          <SwapInterface />
        </div>
      </div>
      
      {/* Black hole cursor effect */}
      <BlackHoleCursor />
    </div>
  );
};

export default Index;
