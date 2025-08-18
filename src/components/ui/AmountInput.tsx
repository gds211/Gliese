import { forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface AmountInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  align?: "left" | "right";
}

export const AmountInput = forwardRef<HTMLInputElement, AmountInputProps>(
  ({ className, align = "right", ...props }, ref) => {
    return (
      <Input
        ref={ref}
        className={cn(
          "border-none bg-transparent text-9xl font-bold tabular-nums",
          "focus-visible:ring-0 focus-visible:outline-none focus-visible:border-none",
          "p-0 h-auto shadow-none caret-white pointer-events-auto",
          align === "right" ? "text-right" : "text-left",
          className
        )}
        placeholder="0.00"
        {...props}
      />
    );
  }
);

AmountInput.displayName = "AmountInput";