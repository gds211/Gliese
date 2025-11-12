import { Card } from "@/components/ui/card";

const EmptyCard = () => {
  return (
    <Card className="w-[448px] bg-muted/40 backdrop-blur-md border border-muted/60 shadow-2xl">
      <div className="p-4 space-y-4">
        {/* Empty card - matches SwapInterface dimensions */}
      </div>
    </Card>
  );
};

export default EmptyCard;
