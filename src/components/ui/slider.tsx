import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center cursor-pointer",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-2.5 w-full grow overflow-hidden rounded-full bg-white/20 hover:bg-white/25 transition-colors">
      <SliderPrimitive.Range className="absolute h-full bg-transparent" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-3 w-3 rounded-full bg-[#1a2332] border-2 border-[#f97316] shadow-lg transition-all hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f17] disabled:pointer-events-none disabled:opacity-50 cursor-grab active:cursor-grabbing" />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
