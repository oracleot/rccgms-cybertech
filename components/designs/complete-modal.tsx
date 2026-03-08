"use client"

import { useState, useCallback } from "react"
import { Loader2, Send } from "lucide-react"
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
import { DesignFileUpload } from "@/components/designs/design-file-upload"
import { updateRequest } from "@/app/(dashboard)/designs/actions"
import type { DeliverableFile } from "@/lib/validations/designs"

interface CompleteModalProps {
  requestId: string
  requestTitle: string
  uploaderId: string
  existingFiles?: DeliverableFile[]
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CompleteModal({
  requestId,
  requestTitle,
  uploaderId,
  existingFiles = [],
  isOpen,
  onClose,
  onSuccess,
}: CompleteModalProps) {
  const [files, setFiles] = useState<DeliverableFile[]>(existingFiles)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFilesChange = useCallback((updated: DeliverableFile[]) => {
    setFiles(updated)
    setError(null)
  }, [])

  const handleSubmit = async () => {
    if (files.length === 0) {
      setError("Please upload at least one design file")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await updateRequest(requestId, {
        status: "review",
        deliverableFiles: files,
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
    setFiles(existingFiles)
    setError(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-blue-600" />
            Submit for Review
          </DialogTitle>
          <DialogDescription>
            Upload the design files for <span className="font-semibold">&quot;{requestTitle}&quot;</span> and
            submit for approval by an admin or leader.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>
              Design Files <span className="text-red-500">*</span>
            </Label>
            <DesignFileUpload
              requestId={requestId}
              uploaderId={uploaderId}
              existingFiles={existingFiles}
              onFilesChange={handleFilesChange}
              disabled={isSubmitting}
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
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || files.length === 0}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit for Review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
