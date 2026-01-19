"use client"

import { useState } from "react"
import { CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface MarkCompleteProps {
  stepId: string
  requiresVerification?: boolean
  isCompleted?: boolean
  onComplete: (stepId: string) => Promise<void>
}

export function MarkComplete({ 
  stepId, 
  requiresVerification = false, 
  isCompleted = false,
  onComplete 
}: MarkCompleteProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleComplete = async () => {
    setIsLoading(true)
    try {
      await onComplete(stepId)
    } finally {
      setIsLoading(false)
      setShowConfirm(false)
    }
  }

  if (isCompleted) {
    return (
      <div className="flex items-center gap-2 text-green-600">
        <CheckCircle2 className="h-5 w-5" />
        <span className="font-medium">Completed</span>
      </div>
    )
  }

  return (
    <>
      <Button 
        onClick={() => requiresVerification ? setShowConfirm(true) : handleComplete()}
        disabled={isLoading}
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : requiresVerification ? (
          "Request Verification"
        ) : (
          <>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Mark as Complete
          </>
        )}
      </Button>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Request Mentor Verification?</AlertDialogTitle>
            <AlertDialogDescription>
              This step requires verification by a mentor. They will be notified 
              to review your completion. You may need to demonstrate your skills 
              in person before they can approve.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleComplete} disabled={isLoading}>
              {isLoading ? "Submitting..." : "Request Verification"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
