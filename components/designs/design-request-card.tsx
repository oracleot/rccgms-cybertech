"use client"

import { useState } from "react"
import Link from "next/link"
import { Calendar, Clock, User, UserCheck } from "lucide-react"
import { format, formatDistanceToNow, isPast } from "date-fns"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { DesignRequestListItem } from "@/types/designs"
import { DesignStatusBadge } from "./design-status-badge"
import { DesignPriorityBadge } from "./design-priority-badge"
import { ClaimModal } from "./claim-modal"

interface DesignRequestCardProps {
  request: DesignRequestListItem
  className?: string
  onUpdate?: () => void
}

export function DesignRequestCard({ request, className, onUpdate }: DesignRequestCardProps) {
  const [showClaimModal, setShowClaimModal] = useState(false)
  const [claimAction, setClaimAction] = useState<"claim" | "unclaim">("claim")
  const isPastDeadline = request.neededBy && isPast(new Date(request.neededBy))
  const isUnclaimed = !request.assignee

  const handleClaimClick = (e: React.MouseEvent, action: "claim" | "unclaim") => {
    e.preventDefault()
    e.stopPropagation()
    setClaimAction(action)
    setShowClaimModal(true)
  }

  return (
    <>
      <Card className={cn("transition-all hover:shadow-md group", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-1">
              <Link href={`/designs/${request.id}`} className="block">
                <h3 className="font-semibold text-lg leading-tight line-clamp-2 group-hover:text-primary transition-colors cursor-pointer">
                  {request.title}
                </h3>
              </Link>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {request.requesterName}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <DesignPriorityBadge priority={request.priority} showIcon />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <DesignStatusBadge status={request.status} />
          
          {request.type && (
            <Badge variant="outline" className="capitalize">
              {request.type.replace(/_/g, " ")}
            </Badge>
          )}

          {request.neededBy && (
            <Badge
              variant="outline"
              className={cn(
                "flex items-center gap-1",
                isPastDeadline && "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
              )}
            >
              <Calendar className="h-3 w-3" />
              {format(new Date(request.neededBy), "MMM d")}
              {isPastDeadline && " (Past due)"}
            </Badge>
          )}
        </div>
      </CardContent>

        <CardFooter className="pt-3 border-t">
          <div className="flex w-full items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">
              {request.assignee ? (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Assigned to <span className="font-medium text-foreground">{request.assignee.name}</span>
                </span>
              ) : (
                <span className="text-orange-600 dark:text-orange-400 font-medium">
                  Unclaimed
                </span>
              )}
            </span>
            
            {isUnclaimed ? (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => handleClaimClick(e, "claim")}
                className="ml-auto"
              >
                <UserCheck className="h-4 w-4 mr-1" />
                Claim
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => handleClaimClick(e, "unclaim")}
                className="ml-auto text-muted-foreground hover:text-foreground"
              >
                Unclaim
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>

      <ClaimModal
        requestId={request.id}
        requestTitle={request.title}
        action={claimAction}
        isOpen={showClaimModal}
        onClose={() => setShowClaimModal(false)}
        onSuccess={async () => {
          setShowClaimModal(false)
          // Small delay to ensure server-side revalidation completes
          await new Promise(resolve => setTimeout(resolve, 100))
          onUpdate?.()
        }}
      />
    </>
  )
}
