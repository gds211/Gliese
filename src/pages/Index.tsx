import Navigation from "@/components/Navigation";
import SwapInterface from "@/components/SwapInterface";
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
        <div className="flex justify-center pt-24 min-h-[calc(100vh-80px)]">
          <SwapInterface />
        </div>
      </div>
    </div>
  );
};

export default Index;
