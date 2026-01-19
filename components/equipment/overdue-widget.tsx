import { formatDistanceToNow } from "date-fns"
import { AlertTriangle, Clock3 } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type OverdueCheckout } from "@/types/equipment"

interface OverdueWidgetProps {
  items: OverdueCheckout[]
}

export function OverdueWidget({ items }: OverdueWidgetProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Overdue checkouts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No overdue items 🎉</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="rounded-md border p-3 text-sm">
              <p className="font-medium text-foreground">{item.equipmentName}</p>
              <p className="text-muted-foreground">{item.checkedOutBy.name}</p>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <Clock3 className="h-4 w-4" />
                Due {formatDistanceToNow(new Date(item.expectedReturn), { addSuffix: true })}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
