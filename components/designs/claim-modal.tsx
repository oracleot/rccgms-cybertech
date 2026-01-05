"use client"

import { useState } from "react"
import { Loader2, UserCheck, UserX } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { claimRequest, unclaimRequest } from "@/app/(dashboard)/designs/actions"

interface ClaimModalProps {
  requestId: string
  requestTitle: string
  action: "claim" | "unclaim"
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ClaimModal({
  requestId,
  requestTitle,
  action,
  isOpen,
  onClose,
  onSuccess,
}: ClaimModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      const result = action === "claim"
        ? await claimRequest(requestId)
        : await unclaimRequest(requestId)

      if (!result.success) {
        throw new Error(result.error)
      }

      // Only call onSuccess - parent will handle closing modal and refreshing
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsSubmitting(false)
    }
  }

  const isClaim = action === "claim"

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isClaim ? (
              <>
                <UserCheck className="h-5 w-5 text-green-600" />
                Claim Design Request
              </>
            ) : (
              <>
                <UserX className="h-5 w-5 text-orange-600" />
                Unclaim Design Request
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isClaim ? (
              <>
                You're about to claim <span className="font-semibold">"{requestTitle}"</span>.
                This will assign the request to you, change its status to "In Progress", and make you responsible for completing it.
              </>
            ) : (
              <>
                You're about to unclaim <span className="font-semibold">"{requestTitle}"</span>.
                The request will be reset to "Pending" status and made available for others to claim.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
            {error}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            variant={isClaim ? "default" : "destructive"}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isClaim ? "Claim Request" : "Unclaim Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
