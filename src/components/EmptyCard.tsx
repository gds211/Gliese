import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

const EmptyCard = () => {
  // In future: const hasOrders = triggerOrders.length > 0;
  const hasOrders = false; // placeholder

  return (
    <Card className="w-[448px] bg-muted/40 backdrop-blur-md border border-muted/60 shadow-2xl">
      <div className="p-4 space-y-3 min-h-[350px] flex flex-col">
        {/* Header - glassmorphic design with better spacing */}
        <div className="h-10 bg-background/40 backdrop-blur-sm rounded-lg border border-white/10 flex items-center justify-center px-4">
          <span className="text-sm font-semibold text-foreground/90 tracking-wide">All Trigger Orders</span>
        </div>
        
        {/* Content area */}
        <div className="flex-1 flex flex-col">
          {!hasOrders ? (
            /* Enhanced Empty State */
            <div className="flex-1 flex flex-col items-center justify-center py-12 px-6">
              <div className="text-center space-y-4">
                {/* Glassmorphic Icon Container */}
                <div className="w-20 h-20 mx-auto rounded-2xl bg-background/40 backdrop-blur-sm flex items-center justify-center border border-white/10 shadow-lg">
                  <span className="text-4xl">📋</span>
                </div>
                
                {/* Text Content - cleaner, no extra hint */}
                <div className="space-y-2">
                  <p className="text-base font-semibold text-foreground/90">No Active Orders</p>
                  <p className="text-sm text-muted-foreground/80 max-w-[240px] mx-auto leading-relaxed">
                    Your trigger orders will appear here once created
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Orders List with ScrollArea */
            <ScrollArea className="flex-1">
              <div className="space-y-2 pr-2">
                {/* Future: Order items will be mapped here with proper styling */}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </Card>
  );
};

export default EmptyCard;