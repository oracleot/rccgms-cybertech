"use client"

import { useState } from "react"
import { format } from "date-fns"
import { 
  ArrowRightLeft, 
  Check, 
  X, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Loader2,
  User,
  Calendar,
  MessageSquare
} from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { SwapStatus } from "@/types/rota"

export interface SwapRequestCardData {
  id: string
  status: SwapStatus
  reason: string | null
  declineReason?: string | null
  createdAt: string
  resolvedAt: string | null
  requester: {
    id: string
    name: string
    avatarUrl: string | null
  }
  targetUser: {
    id: string
    name: string
    avatarUrl: string | null
  } | null
  assignment: {
    id: string
    date: string
    serviceName: string
    positionName: string
    departmentName: string
  }
}

type ViewerRole = "requester" | "target" | "leader"

interface SwapRequestCardProps {
  request: SwapRequestCardData
  viewerRole: ViewerRole
  currentUserId: string
  onAccept?: (id: string) => Promise<void>
  onDecline?: (id: string, reason?: string) => Promise<void>
  onApprove?: (id: string) => Promise<void>
  onReject?: (id: string, reason?: string) => Promise<void>
  isOpenRequest?: boolean
  className?: string
}

const statusConfig: Record<SwapStatus, {
  label: string
  icon: React.ElementType
  variant: "default" | "secondary" | "destructive" | "outline"
  className: string
}> = {
  pending: {
    label: "Pending",
    icon: Clock,
    variant: "secondary",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  accepted: {
    label: "Awaiting Approval",
    icon: Clock,
    variant: "secondary",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  declined: {
    label: "Declined",
    icon: XCircle,
    variant: "destructive",
    className: "bg-red-100 text-red-800 border-red-200",
  },
  approved: {
    label: "Approved",
    icon: CheckCircle2,
    variant: "default",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    variant: "destructive",
    className: "bg-red-100 text-red-800 border-red-200",
  },
}

export function SwapRequestCard({
  request,
  viewerRole,
  currentUserId,
  onAccept,
  onDecline,
  onApprove,
  onReject,
  isOpenRequest = false,
  className,
}: SwapRequestCardProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [showDeclineDialog, setShowDeclineDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [declineReason, setDeclineReason] = useState("")

  const statusInfo = statusConfig[request.status]
  const StatusIcon = statusInfo.icon

  function getInitials(name: string) {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  async function handleAction(
    action: "accept" | "approve",
    handler?: (id: string) => Promise<void>
  ) {
    if (!handler) return

    setIsLoading(action)
    try {
      await handler(request.id)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to ${action} request`)
    } finally {
      setIsLoading(null)
    }
  }

  async function handleDeclineWithReason() {
    if (!onDecline) return

    setIsLoading("decline")
    try {
      await onDecline(request.id, declineReason || undefined)
      setShowDeclineDialog(false)
      setDeclineReason("")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to decline request")
    } finally {
      setIsLoading(null)
    }
  }

  async function handleRejectWithReason() {
    if (!onReject) return

    setIsLoading("reject")
    try {
      await onReject(request.id, declineReason || undefined)
      setShowRejectDialog(false)
      setDeclineReason("")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reject request")
    } finally {
      setIsLoading(null)
    }
  }

  // For open requests, anyone can accept (except the requester)
  // For targeted requests, only the target can accept/decline
  const canAcceptDecline = 
    request.status === "pending" && (
      isOpenRequest || 
      (viewerRole === "target" && request.targetUser?.id === currentUserId)
    )

  const canApproveReject = 
    viewerRole === "leader" && 
    request.status === "accepted"

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-4">
        {/* Header with status */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-muted">
              <ArrowRightLeft className="h-4 w-4" />
            </div>
            <div>
              <h4 className="font-medium text-sm">Swap Request</h4>
              <p className="text-xs text-muted-foreground">
                {format(new Date(request.createdAt), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
          </div>
          <Badge variant="outline" className={cn("flex items-center gap-1", statusInfo.className)}>
            <StatusIcon className="h-3 w-3" />
            {statusInfo.label}
          </Badge>
        </div>

        {/* Assignment details */}
        <div className="bg-muted/50 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 text-sm mb-1">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {format(new Date(request.assignment.date), "EEEE, MMMM d, yyyy")}
            </span>
          </div>
          <p className="text-sm text-muted-foreground ml-6">
            {request.assignment.positionName} • {request.assignment.serviceName}
          </p>
          <Badge variant="outline" className="mt-2 ml-6">
            {request.assignment.departmentName}
          </Badge>
        </div>

        {/* People involved */}
        <div className="flex items-center gap-3 mb-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8 border-2 border-background">
                    <AvatarImage src={request.requester.avatarUrl || undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(request.requester.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{request.requester.name}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>Requesting swap</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <ArrowRightLeft className="h-4 w-4 text-muted-foreground flex-shrink-0" />

          {request.targetUser ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8 border-2 border-background">
                      <AvatarImage src={request.targetUser.avatarUrl || undefined} />
                      <AvatarFallback className="text-xs">
                        {getInitials(request.targetUser.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{request.targetUser.name}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Requested to cover</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="h-8 w-8 rounded-full border-2 border-dashed border-muted-foreground/50 flex items-center justify-center">
                <User className="h-4 w-4" />
              </div>
              <span className="text-sm italic">Open request</span>
            </div>
          )}
        </div>

        {/* Reason */}
        {request.reason && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground mb-4 p-3 bg-muted/30 rounded-lg">
            <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p className="italic">&quot;{request.reason}&quot;</p>
          </div>
        )}

        {/* Decline/Reject reason (if declined/rejected) */}
        {request.declineReason && (request.status === "declined" || request.status === "rejected") && (
          <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 mb-4 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
            <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-xs uppercase mb-1">
                {request.status === "declined" ? "Decline" : "Rejection"} Reason
              </p>
              <p className="italic">&quot;{request.declineReason}&quot;</p>
            </div>
          </div>
        )}

        {/* Actions */}
        {(canAcceptDecline || canApproveReject) && (
          <div className="flex items-center gap-2 pt-2 border-t">
            {canAcceptDecline && (
              <>
                <Button
                  size="sm"
                  variant="default"
                  className="flex-1"
                  onClick={() => handleAction("accept", onAccept)}
                  disabled={isLoading !== null}
                >
                  {isLoading === "accept" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Accept
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowDeclineDialog(true)}
                  disabled={isLoading !== null}
                >
                  <X className="h-4 w-4 mr-1" />
                  Decline
                </Button>
              </>
            )}

            {canApproveReject && (
              <>
                <Button
                  size="sm"
                  variant="default"
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => handleAction("approve", onApprove)}
                  disabled={isLoading !== null}
                >
                  {isLoading === "approve" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Approve
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => setShowRejectDialog(true)}
                  disabled={isLoading !== null}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>

      {/* Decline Dialog */}
      <Dialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Swap Request</DialogTitle>
            <DialogDescription>
              Let {request.requester.name} know why you can&apos;t cover this duty.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="e.g., I'm already scheduled for another service, traveling that day, etc."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeclineDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeclineWithReason}
              disabled={isLoading === "decline"}
            >
              {isLoading === "decline" ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Decline Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog (for leaders) */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Swap Request</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this swap between {request.requester.name} and {request.targetUser?.name || "the member"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="e.g., Coverage requirements not met, scheduling conflict, etc."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRejectWithReason}
              disabled={isLoading === "reject"}
            >
              {isLoading === "reject" ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Reject Swap
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
