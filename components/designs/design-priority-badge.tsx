import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { DesignPriority } from "@/types/designs"
import { AlertTriangle, ArrowUp, Minus, Zap } from "lucide-react"

interface DesignPriorityBadgeProps {
  priority: DesignPriority
  className?: string
  showIcon?: boolean
}

const priorityConfig: Record<
  DesignPriority,
  {
    label: string
    variant: "default" | "secondary" | "destructive" | "outline"
    className: string
    icon: typeof Minus
  }
> = {
  low: {
    label: "Low",
    variant: "secondary",
    className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    icon: Minus,
  },
  medium: {
    label: "Medium",
    variant: "outline",
    className: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    icon: ArrowUp,
  },
  high: {
    label: "High",
    variant: "default",
    className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    icon: AlertTriangle,
  },
  urgent: {
    label: "Urgent",
    variant: "destructive",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    icon: Zap,
  },
}

export function DesignPriorityBadge({
  priority,
  className,
  showIcon = false,
}: DesignPriorityBadgeProps) {
  const config = priorityConfig[priority]
  const Icon = config.icon

  return (
    <Badge variant={config.variant} className={cn(config.className, className)}>
      {showIcon && <Icon className="mr-1 h-3 w-3" />}
      {config.label}
    </Badge>
  )
}
