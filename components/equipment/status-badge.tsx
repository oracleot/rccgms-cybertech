import { Badge } from "@/components/ui/badge"
import { EQUIPMENT_STATUS_COLORS, EQUIPMENT_STATUS_LABELS, type EquipmentStatus } from "@/lib/constants"

interface EquipmentStatusBadgeProps {
  status: EquipmentStatus
}

export function EquipmentStatusBadge({ status }: EquipmentStatusBadgeProps) {
  const label = EQUIPMENT_STATUS_LABELS[status] || status
  const colorClass = EQUIPMENT_STATUS_COLORS[status] || "bg-gray-100 text-gray-800"

  return <Badge className={colorClass}>{label}</Badge>
}
