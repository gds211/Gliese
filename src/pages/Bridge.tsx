import Navigation from "@/components/Navigation";
import WormholeBridge from "@/components/WormholeBridge";

export default function Bridge() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cosmic-dark via-cosmic-darker to-black">
      <div className="fixed inset-0 bg-[url('/cosmic-background.jpg')] bg-cover bg-center opacity-20 pointer-events-none" />
      
      <div className="relative z-10">
        <Navigation />
        
        <main className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)]">
            <WormholeBridge />
          </div>
        </main>
      </div>
    </div>
  );
}
