"use client"

import { useState } from "react"
import { Loader2, Trash2, AlertTriangle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { deleteRequest } from "@/app/(dashboard)/designs/actions"

interface DeleteModalProps {
  requestId: string
  requestTitle: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function DeleteModal({
  requestId,
  requestTitle,
  isOpen,
  onClose,
  onSuccess,
}: DeleteModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      const result = await deleteRequest(requestId)

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            Delete Design Request
          </DialogTitle>
          <DialogDescription>
            You&apos;re about to delete <span className="font-semibold">&quot;{requestTitle}&quot;</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <p className="font-semibold mb-1">This action is permanent</p>
              <p>
                Deleting this request will permanently remove it from the system.
                This cannot be undone. All associated notes and history will be lost.
              </p>
            </div>
          </div>
        </div>

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
            onClick={handleDelete}
            disabled={isSubmitting}
            variant="destructive"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
