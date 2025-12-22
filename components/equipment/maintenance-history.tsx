import { format } from "date-fns"
import { Wrench } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MAINTENANCE_TYPE_LABELS, type MaintenanceType } from "@/lib/constants"

export interface MaintenanceEntry {
  id: string
  type: MaintenanceType
  description: string
  performedBy: { id: string; name: string } | null
  performedAt: string
  nextDue?: string | null
  cost?: number | null
  vendor?: string | null
}

interface MaintenanceHistoryProps {
  items: MaintenanceEntry[]
}

export function MaintenanceHistory({ items }: MaintenanceHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Maintenance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No maintenance logged.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="secondary" className="capitalize">
                    {MAINTENANCE_TYPE_LABELS[item.type] || item.type}
                  </Badge>
                  <span className="font-medium text-foreground">{item.description}</span>
                  <span className="ml-auto flex items-center gap-1 text-xs uppercase tracking-wide text-muted-foreground">
                    <Wrench className="h-4 w-4" />
                    {format(new Date(item.performedAt), "PP")}
                  </span>
                </div>
                {item.performedBy && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    By {item.performedBy.name}
                  </p>
                )}
                {item.vendor && (
                  <p className="text-sm text-muted-foreground">Vendor: {item.vendor}</p>
                )}
                {item.nextDue && (
                  <p className="text-sm text-muted-foreground">Next due: {format(new Date(item.nextDue), "PP")}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
