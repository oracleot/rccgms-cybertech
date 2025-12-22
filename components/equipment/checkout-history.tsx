import { format } from "date-fns"
import { Clock3, CornerDownRight } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export interface CheckoutEntry {
  id: string
  checkedOutBy: {
    id: string
    name: string
  }
  checkedOutAt: string
  expectedReturn: string
  returnedAt: string | null
  conditionOnReturn?: string | null
  notes?: string | null
}

interface CheckoutHistoryProps {
  items: CheckoutEntry[]
}

export function CheckoutHistory({ items }: CheckoutHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Return history</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No checkouts yet.</p>
        ) : (
          <div className="space-y-4">
            {items.map((checkout) => (
              <div key={checkout.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{checkout.checkedOutBy.name}</span>
                  <CornerDownRight className="h-4 w-4" />
                  <span>
                    Checked out {format(new Date(checkout.checkedOutAt), "PPp")}
                  </span>
                  <Badge variant="outline" className="ml-auto">
                    Due {format(new Date(checkout.expectedReturn), "PPp")}
                  </Badge>
                </div>
                {checkout.returnedAt && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock3 className="h-4 w-4" />
                    Returned {format(new Date(checkout.returnedAt), "PPp")}
                  </div>
                )}
                {checkout.conditionOnReturn && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Condition: {checkout.conditionOnReturn}
                  </p>
                )}
                {checkout.notes && (
                  <p className="mt-2 text-sm text-muted-foreground">Notes: {checkout.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
