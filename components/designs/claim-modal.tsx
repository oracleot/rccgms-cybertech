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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { claimRequest, unclaimRequest } from "@/app/(dashboard)/designs/actions"

interface ClaimModalProps {
  requestId: string
  requestTitle: string
  action: "claim" | "unclaim"
  currentUserRole?: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function ClaimModal({
  requestId,
  requestTitle,
  action,
  currentUserRole = "member",
  isOpen,
  onClose,
  onSuccess,
}: ClaimModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reason, setReason] = useState("")

  const isDeveloperUnclaim = action === "unclaim" && currentUserRole === "developer"

  const handleSubmit = async () => {
    if (isDeveloperUnclaim && !reason.trim()) {
      setError("Please provide a reason for unclaiming this request")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const result = action === "claim"
        ? await claimRequest(requestId)
        : await unclaimRequest(requestId, isDeveloperUnclaim ? reason.trim() : undefined)

      if (!result.success) {
        throw new Error(result.error)
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setReason("")
    setError(null)
    onClose()
  }

  const isClaim = action === "claim"

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
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
                You&apos;re about to claim <span className="font-semibold">&quot;{requestTitle}&quot;</span>.
                This will assign the request to you, change its status to &quot;In Progress&quot;, and make you responsible for completing it.
              </>
            ) : (
              <>
                You&apos;re about to unclaim <span className="font-semibold">&quot;{requestTitle}&quot;</span>.
                The request will be reset to &quot;Pending&quot; status and made available for others to claim.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Reason field for developer unclaim */}
        {isDeveloperUnclaim && (
          <div className="space-y-2 py-2">
            <Label htmlFor="unclaim-reason">
              Reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="unclaim-reason"
              placeholder="Explain why this request needs to be unclaimed (e.g., incident, mistake)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="resize-none"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              Developers must provide a reason for unclaiming. This will be logged in the internal notes.
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
            {error}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
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
