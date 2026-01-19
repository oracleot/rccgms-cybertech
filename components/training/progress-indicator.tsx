"use client"

import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import { NumberTicker } from "@/components/ui/number-ticker"
import { CheckCircle2 } from "lucide-react"

interface ProgressIndicatorProps {
  value: number
  showLabel?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
  animated?: boolean
}

export function ProgressIndicator({ 
  value, 
  showLabel = false, 
  size = "md",
  className,
  animated = false
}: ProgressIndicatorProps) {
  const heights = {
    sm: "h-2",
    md: "h-3",
    lg: "h-4",
  }

  const isComplete = value >= 100

  return (
    <div className={cn("space-y-1.5", className)}>
      {showLabel && (
        <div className="flex justify-between text-sm items-center">
          <span className={cn(
            "text-muted-foreground transition-colors",
            isComplete && "text-green-600 dark:text-green-400 font-medium"
          )}>
            {isComplete ? (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Complete!
              </span>
            ) : (
              "Progress"
            )}
          </span>
          <span className={cn(
            "font-semibold tabular-nums",
            isComplete && "text-green-600 dark:text-green-400"
          )}>
            {animated ? (
              <NumberTicker value={Math.round(value)} className="text-sm" />
            ) : (
              Math.round(value)
            )}%
          </span>
        </div>
      )}
      <div className="relative">
        <Progress 
          value={value} 
          className={cn(
            heights[size],
            "transition-all duration-500",
            isComplete && "[&>div]:bg-green-600 dark:[&>div]:bg-green-500"
          )}
        />
        {/* Shimmer effect on progress bar */}
        {value > 0 && value < 100 && (
          <div 
            className="absolute top-0 left-0 h-full overflow-hidden rounded-full pointer-events-none"
            style={{ width: `${value}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          </div>
        )}
      </div>
    </div>
  )
}
