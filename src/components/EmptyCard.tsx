import { Card } from "@/components/ui/card";
const EmptyCard = () => {
  return <Card className="w-[448px] bg-muted/60 backdrop-blur-md border border-muted/60 shadow-2xl">
      <div className="p-4 space-y-4 min-h-[350px]">
        {/* Header aligned with trigger tab's navbar */}
        <div className="h-10 rounded-md flex items-center justify-center bg-zinc-400">
          <span className="text-sm font-medium text-foreground">All trigger orders</span>
        </div>
        
        {/* Content area */}
        <div className="flex-1">
          {/* Future: List of trigger orders will go here */}
        </div>
      </div>
    </Card>;
};
export default EmptyCard;