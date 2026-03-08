"use client"

import { useState, useCallback } from "react"
import { Loader2, RefreshCw } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { DesignRequestStatus, DesignPriority } from "@/types/designs"
import { updateRequest } from "@/app/(dashboard)/designs/actions"
import { DesignFileUpload } from "@/components/designs/design-file-upload"
import type { DeliverableFile } from "@/lib/validations/designs"

interface UpdateStatusModalProps {
  requestId: string
  requestTitle: string
  currentStatus: DesignRequestStatus
  currentPriority: DesignPriority
  uploaderId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

// Status transition rules
const allowedTransitions: Record<DesignRequestStatus, DesignRequestStatus[]> = {
  pending: ["in_progress", "cancelled"],
  in_progress: ["review", "cancelled"],
  review: ["completed", "revision_requested", "in_progress", "cancelled"],
  revision_requested: ["in_progress", "cancelled"],
  completed: [], // Terminal state
  cancelled: [], // Terminal state
}

const statusLabels: Record<DesignRequestStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  review: "Ready for Review",
  revision_requested: "Revision Requested",
  completed: "Completed",
  cancelled: "Cancelled",
}

const priorityLabels: Record<DesignPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
}

export function UpdateStatusModal({
  requestId,
  requestTitle,
  currentStatus,
  currentPriority,
  uploaderId,
  isOpen,
  onClose,
  onSuccess,
}: UpdateStatusModalProps) {
  const [status, setStatus] = useState<DesignRequestStatus>(currentStatus)
  const [priority, setPriority] = useState<DesignPriority>(currentPriority)
  const [internalNotes, setInternalNotes] = useState("")
  const [revisionNotes, setRevisionNotes] = useState("")
  const [deliverableFiles, setDeliverableFiles] = useState<DeliverableFile[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const allowedStatuses = allowedTransitions[currentStatus] || []
  const isRevisionRequest = status === "revision_requested"
  const isReviewTransition = status === "review" && currentStatus !== "review"

  const handleFilesChange = useCallback((files: DeliverableFile[]) => {
    setDeliverableFiles(files)
  }, [])

  const handleSubmit = async () => {
    // Validate revision notes required for revision_requested status
    if (isRevisionRequest && !revisionNotes.trim()) {
      setError("Please provide revision notes explaining what changes are needed")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await updateRequest(requestId, {
        status: status !== currentStatus ? status : undefined,
        priority: priority !== currentPriority ? priority : undefined,
        internalNotes: internalNotes.trim() || undefined,
        revisionNotes: revisionNotes.trim() || undefined,
        deliverableFiles: isReviewTransition && deliverableFiles.length > 0 ? deliverableFiles : undefined,
      })

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
    // Reset form state
    setStatus(currentStatus)
    setPriority(currentPriority)
    setInternalNotes("")
    setRevisionNotes("")
    setDeliverableFiles([])
    setError(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-blue-600" />
            Update Request
          </DialogTitle>
          <DialogDescription>
            Update the status and details for{" "}
            <span className="font-semibold">&quot;{requestTitle}&quot;</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status Selector */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            {allowedStatuses.length > 0 ? (
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as DesignRequestStatus)}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={currentStatus}>
                    {statusLabels[currentStatus]} (Current)
                  </SelectItem>
                  {allowedStatuses.map((s) => (
                    <SelectItem key={s} value={s}>
                      {statusLabels[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground">
                Status is <span className="font-medium">{statusLabels[currentStatus]}</span> (terminal state - no further changes allowed)
              </p>
            )}
          </div>

          {/* Priority Selector */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select
              value={priority}
              onValueChange={(value) => setPriority(value as DesignPriority)}
            >
              <SelectTrigger id="priority">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(priorityLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Revision Notes (required for revision_requested) */}
          {isRevisionRequest && (
            <div className="space-y-2">
              <Label htmlFor="revisionNotes">
                Revision Notes <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="revisionNotes"
                placeholder="Describe what changes are needed..."
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                These notes will be visible to the requester and appended with a timestamp.
              </p>
            </div>
          )}

          {/* File Upload for Review transition */}
          {isReviewTransition && (
            <div className="space-y-2">
              <Label>Design Files (optional)</Label>
              <DesignFileUpload
                requestId={requestId}
                uploaderId={uploaderId}
                onFilesChange={handleFilesChange}
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                Upload files now, or add them later when completing.
              </p>
            </div>
          )}

          {/* Internal Notes (optional) */}
          <div className="space-y-2">
            <Label htmlFor="internalNotes">Internal Notes (Team Only)</Label>
            <Textarea
              id="internalNotes"
              placeholder="Add notes for the team (not visible to requester)..."
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
            {error}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
