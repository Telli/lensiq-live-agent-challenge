import * as React from "react"
import { cn } from "@/src/lib/utils"

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(
  ({ className, active, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ease-out active:scale-[0.98] border",
          active 
            ? "bg-white border-white text-black shadow-[0_2px_10px_rgba(255,255,255,0.1)]" 
            : "bg-zinc-800/80 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white backdrop-blur-md",
          className
        )}
        {...props}
      />
    )
  }
)
Chip.displayName = "Chip"

export { Chip }
