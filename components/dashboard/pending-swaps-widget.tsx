"use client"

import Link from "next/link"
import { format } from "date-fns"
import { ArrowRightLeft, ArrowRight, AlertCircle } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface PendingSwap {
  id: string
  requesterName: string
  requesterInitials: string
  targetUserName: string | null
  positionName: string
  serviceName: string
  date: string
  status: "pending" | "accepted"
}

interface PendingSwapsWidgetProps {
  swaps: PendingSwap[]
  maxItems?: number
}

export function PendingSwapsWidget({
  swaps,
  maxItems = 4,
}: PendingSwapsWidgetProps) {
  const displayedSwaps = swaps.slice(0, maxItems)
  const pendingCount = swaps.filter((s) => s.status === "pending").length
  const acceptedCount = swaps.filter((s) => s.status === "accepted").length

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Pending Swap Requests
            {swaps.length > 0 && (
              <Badge variant="secondary">{swaps.length}</Badge>
            )}
          </CardTitle>
          <CardDescription>
            {pendingCount > 0 && `${pendingCount} awaiting response`}
            {pendingCount > 0 && acceptedCount > 0 && " • "}
            {acceptedCount > 0 && `${acceptedCount} need approval`}
            {swaps.length === 0 && "No pending requests"}
          </CardDescription>
        </div>
        {swaps.length > 0 && (
          <Button variant="ghost" size="sm" asChild>
            <Link href="/rota/swaps">
              Manage
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {displayedSwaps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <ArrowRightLeft className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No swap requests to review
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {displayedSwaps.map((swap) => (
              <li
                key={swap.id}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="text-xs">
                    {swap.requesterInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">
                      {swap.requesterName}
                    </span>
                    {swap.status === "accepted" && (
                      <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Needs Approval
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {swap.positionName} • {swap.serviceName}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-medium">
                    {format(new Date(swap.date), "MMM d")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
        {swaps.length > maxItems && (
          <p className="mt-3 text-center text-sm text-muted-foreground">
            +{swaps.length - maxItems} more requests
          </p>
        )}
      </CardContent>
    </Card>
  )
}
