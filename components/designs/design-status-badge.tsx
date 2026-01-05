import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { DesignRequestStatus } from "@/types/designs"

interface DesignStatusBadgeProps {
  status: DesignRequestStatus
  className?: string
}

const statusConfig: Record<
  DesignRequestStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className: string }
> = {
  pending: {
    label: "Pending",
    variant: "secondary",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  },
  in_progress: {
    label: "In Progress",
    variant: "default",
    className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  },
  review: {
    label: "In Review",
    variant: "secondary",
    className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  },
  revision_requested: {
    label: "Revision Requested",
    variant: "outline",
    className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  },
  completed: {
    label: "Completed",
    variant: "secondary",
    className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  },
  cancelled: {
    label: "Cancelled",
    variant: "destructive",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  },
}

export function DesignStatusBadge({ status, className }: DesignStatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <Badge variant={config.variant} className={cn(config.className, className)}>
      {config.label}
    </Badge>
  )
}
