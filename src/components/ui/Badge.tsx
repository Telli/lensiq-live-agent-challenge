import * as React from "react"
import { cn } from "@/src/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline" | "success" | "warning";
  className?: string;
  children?: React.ReactNode;
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        {
          "border-transparent bg-white text-black": variant === "default",
          "border-transparent bg-zinc-800 text-zinc-100": variant === "secondary",
          "text-zinc-100 border-zinc-700": variant === "outline",
          "border-transparent bg-emerald-500/20 text-emerald-400 border-emerald-500/30": variant === "success",
          "border-transparent bg-amber-500/20 text-amber-400 border-amber-500/30": variant === "warning",
        },
        className
      )}
      {...props}
    />
  )
}

export { Badge }
