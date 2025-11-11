import { Card } from "@/components/ui/card";

const EmptyCard = () => {
  return (
    <Card className="w-full max-w-md bg-muted/40 backdrop-blur-md border border-muted/60 shadow-2xl">
      <div className="p-4 space-y-4 min-h-[620px]">
        {/* Empty for now - can add content later */}
      </div>
    </Card>
  );
};

export default EmptyCard;
