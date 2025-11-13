import { Card } from "@/components/ui/card";

const EmptyCard = () => {
  // In future: const hasOrders = triggerOrders.length > 0;
  const hasOrders = false; // placeholder

  return (
    <Card className="w-[448px] bg-muted/60 backdrop-blur-md border border-muted/60 shadow-2xl">
      <div className="p-4 space-y-4 min-h-[350px] flex flex-col">
        {/* Header aligned with trigger tab's navbar */}
        <div className="h-10 rounded-md flex items-center justify-center bg-zinc-400">
          <span className="text-sm font-medium text-foreground">All trigger orders</span>
        </div>
        
        {/* Content area */}
        <div className="flex-1 flex flex-col">
          {!hasOrders ? (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center py-8 px-4">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 mx-auto rounded-full bg-muted/40 flex items-center justify-center border border-white/10">
                  <span className="text-3xl">📋</span>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">No active orders</p>
                  <p className="text-xs text-muted-foreground max-w-[200px] mx-auto">
                    Your trigger orders will appear here once created
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Orders List - for future implementation */
            <div className="space-y-2 overflow-y-auto">
              {/* Order items will be mapped here */}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default EmptyCard;