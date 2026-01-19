"use client"

import { useState } from "react"
import { Clock, User, X, Users, Wrench, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
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

  const stepTypeConfig = {
    video: { icon: null, color: "bg-red-500/10 text-red-600", badge: "secondary" },
    document: { icon: null, color: "bg-blue-500/10 text-blue-600", badge: "secondary" },
    quiz: { icon: null, color: "bg-purple-500/10 text-purple-600", badge: "outline" },
    shadowing: { icon: Users, color: "bg-orange-500/10 text-orange-600", badge: "default" },
    practical: { icon: Wrench, color: "bg-green-500/10 text-green-600", badge: "default" },
  } as const

  const config = stepTypeConfig[request.stepType] || stepTypeConfig.practical
  const StepIcon = config.icon || Wrench

  return (
    <>
      <Card className="group relative overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
        {/* Subtle gradient background on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        
        <CardHeader className="relative pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={cn("p-2 rounded-lg shrink-0", config.color.split(" ")[0])}>
                <StepIcon className={cn("h-4 w-4", config.color.split(" ")[1])} />
              </div>
              <div>
                <CardTitle className="text-base group-hover:text-primary transition-colors">
                  {request.stepTitle}
                </CardTitle>
                <CardDescription className="mt-0.5">{request.trackName}</CardDescription>
              </div>
            </div>
            <Badge 
              variant={config.badge as "default" | "secondary" | "outline"}
              className="capitalize shrink-0"
            >
              {request.stepType}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="relative space-y-4">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium">{request.userName}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>
                {new Date(request.completedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleApprove} 
              disabled={isLoading}
              className="flex-1 bg-green-600 hover:bg-green-700 group/btn"
            >
              <CheckCircle2 className="h-4 w-4 mr-2 transition-transform group-hover/btn:scale-110" />
              Approve
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowRejectDialog(true)}
              disabled={isLoading}
              className="flex-1 hover:border-red-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
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
