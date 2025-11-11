import Navigation from "@/components/Navigation";
import SwapInterface from "@/components/SwapInterface";
import EmptyCard from "@/components/EmptyCard";
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
        <div className="flex flex-col lg:flex-row justify-center items-start gap-6 pt-[calc(50vh-300px)] min-h-[calc(100vh-80px)] px-4">
          <SwapInterface />
          <EmptyCard />
        </div>
      </div>
    </div>
  );
};

export default Index;
