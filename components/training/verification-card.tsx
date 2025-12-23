"use client"

import { useState } from "react"
import { Check, Clock, User, X } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { VerificationRequest } from "@/types/training"

interface VerificationCardProps {
  request: VerificationRequest
  onVerify: (completionId: string, approved: boolean, notes?: string) => Promise<void>
}

export function VerificationCard({ request, onVerify }: VerificationCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [notes, setNotes] = useState("")

  const handleApprove = async () => {
    setIsLoading(true)
    try {
      await onVerify(request.id, true)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReject = async () => {
    setIsLoading(true)
    try {
      await onVerify(request.id, false, notes)
    } finally {
      setIsLoading(false)
      setShowRejectDialog(false)
      setNotes("")
    }
  }

  const stepTypeBadgeVariant = {
    video: "secondary",
    document: "secondary",
    quiz: "outline",
    shadowing: "default",
    practical: "default",
  } as const

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base">{request.stepTitle}</CardTitle>
              <CardDescription>{request.trackName}</CardDescription>
            </div>
            <Badge variant={stepTypeBadgeVariant[request.stepType] || "secondary"}>
              {request.stepType}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>{request.userName}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>
                {new Date(request.completedAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleApprove} 
              disabled={isLoading}
              className="flex-1"
            >
              <Check className="h-4 w-4 mr-2" />
              Approve
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowRejectDialog(true)}
              disabled={isLoading}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Reject
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Verification</DialogTitle>
            <DialogDescription>
              Please provide feedback to help {request.userName} understand what 
              they need to improve.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="notes">Feedback (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What should they work on before requesting verification again?"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={isLoading}
            >
              {isLoading ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
