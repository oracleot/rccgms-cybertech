import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { RotaStatus } from "@/types/rota"

interface RotaStatusBadgeProps {
  status: RotaStatus
  className?: string
}

const statusConfig: Record<RotaStatus, { label: string; variant: "default" | "secondary" | "outline" }> = {
  draft: {
    label: "Draft",
    variant: "secondary",
  },
  published: {
    label: "Published",
    variant: "default",
  },
}

export function RotaStatusBadge({ status, className }: RotaStatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <Badge
      variant={config.variant}
      className={cn(
        status === "published" && "bg-green-500 hover:bg-green-600",
        status === "draft" && "bg-amber-500 hover:bg-amber-600",
        className
      )}
    >
      {config.label}
    </Badge>
  )
}
