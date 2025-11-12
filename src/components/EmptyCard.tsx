import { Card } from "@/components/ui/card";

const EmptyCard = () => {
  return (
    <Card className="w-[448px] bg-muted/40 backdrop-blur-md border border-muted/60 shadow-2xl">
      <div className="p-4 space-y-4">
        {/* Header aligned with navigation tabs */}
        <div className="w-full bg-muted/40 h-10 rounded-lg flex items-center justify-center">
          <span className="text-sm font-medium text-foreground">All trigger orders</span>
        </div>
      </div>
    </Card>
  );
};

export default EmptyCard;
