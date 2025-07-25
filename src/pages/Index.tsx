import Navigation from "@/components/Navigation";
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
      <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px]" />
      
      {/* Content */}
      <div className="relative z-10">
        <Navigation />
        
        {/* Main Content Area */}
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center space-y-6 max-w-4xl mx-auto px-6">
            <h1 className="text-6xl md:text-8xl font-bold bg-gradient-cosmic bg-clip-text text-transparent">
              GLIESE
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Navigate the cosmic frontier of decentralized finance
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
              <button className="px-8 py-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all duration-300 hover:scale-105 shadow-glow-cosmic text-lg font-semibold">
                Launch App
              </button>
              <button className="px-8 py-4 bg-card/30 text-foreground rounded-lg hover:bg-card/50 transition-all duration-300 backdrop-blur-sm border border-border/20 text-lg font-semibold">
                Learn More
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
