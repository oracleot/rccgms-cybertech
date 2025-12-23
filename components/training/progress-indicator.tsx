"use client"

import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"

interface ProgressIndicatorProps {
  value: number
  showLabel?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
}

export function ProgressIndicator({ 
  value, 
  showLabel = false, 
  size = "md",
  className 
}: ProgressIndicatorProps) {
  const heights = {
    sm: "h-2",
    md: "h-3",
    lg: "h-4",
  }

  return (
    <div className={cn("space-y-1", className)}>
      {showLabel && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{Math.round(value)}%</span>
        </div>
      )}
      <Progress 
        value={value} 
        className={cn(heights[size])}
      />
    </div>
  )
}
