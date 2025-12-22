"use client"

import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { AlertTriangle, Package, ArrowRight, Clock } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface EquipmentAlert {
  id: string
  equipmentId: string
  equipmentName: string
  category: string
  borrowerName: string
  dueDate: string
  daysOverdue: number
}

interface MaintenanceItem {
  id: string
  equipmentId: string
  equipmentName: string
  category: string
  scheduledDate: string
  type: string
}

interface EquipmentAlertsWidgetProps {
  overdueItems: EquipmentAlert[]
  upcomingMaintenance: MaintenanceItem[]
  maxItems?: number
}

export function EquipmentAlertsWidget({
  overdueItems,
  upcomingMaintenance,
  maxItems = 3,
}: EquipmentAlertsWidgetProps) {
  const displayedOverdue = overdueItems.slice(0, maxItems)
  const displayedMaintenance = upcomingMaintenance.slice(0, 2)
  const totalAlerts = overdueItems.length + upcomingMaintenance.length

  return (
    <Card className={overdueItems.length > 0 ? "border-destructive/50" : undefined}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            {overdueItems.length > 0 ? (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            ) : (
              <Package className="h-5 w-5" />
            )}
            Equipment Alerts
            {totalAlerts > 0 && (
              <Badge variant={overdueItems.length > 0 ? "destructive" : "secondary"}>
                {totalAlerts}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {overdueItems.length > 0
              ? `${overdueItems.length} overdue item${overdueItems.length > 1 ? "s" : ""}`
              : "All equipment accounted for"}
          </CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/equipment">
            View All
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overdue Items */}
        {displayedOverdue.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-destructive mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Overdue Returns
            </h4>
            <ul className="space-y-2">
              {displayedOverdue.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/equipment/${item.equipmentId}`}
                    className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-3 transition-colors hover:bg-destructive/10"
                  >
                    <div>
                      <p className="font-medium">{item.equipmentName}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.borrowerName} • {item.category}
                      </p>
                    </div>
                    <Badge variant="destructive">
                      {item.daysOverdue} day{item.daysOverdue > 1 ? "s" : ""} overdue
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
            {overdueItems.length > maxItems && (
              <p className="mt-2 text-sm text-muted-foreground text-center">
                +{overdueItems.length - maxItems} more overdue
              </p>
            )}
          </div>
        )}

        {/* Upcoming Maintenance */}
        {displayedMaintenance.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Upcoming Maintenance
            </h4>
            <ul className="space-y-2">
              {displayedMaintenance.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/equipment/${item.equipmentId}`}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted"
                  >
                    <div>
                      <p className="font-medium">{item.equipmentName}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.type} • {item.category}
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(item.scheduledDate), {
                        addSuffix: true,
                      })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Empty State */}
        {totalAlerts === 0 && (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Package className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No equipment alerts at this time
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
