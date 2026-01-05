"use client"

import { useState } from "react"
import { Loader2, CheckCircle2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { completeRequest } from "@/app/(dashboard)/designs/actions"

interface CompleteModalProps {
  requestId: string
  requestTitle: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CompleteModal({
  requestId,
  requestTitle,
  isOpen,
  onClose,
  onSuccess,
}: CompleteModalProps) {
  const [deliverableUrl, setDeliverableUrl] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    // Basic validation
    if (!deliverableUrl.trim()) {
      setError("Please enter a deliverable URL")
      return
    }

    // URL validation
    try {
      new URL(deliverableUrl)
    } catch {
      setError("Please enter a valid URL (e.g., https://drive.google.com/...)")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await completeRequest(requestId, deliverableUrl.trim())

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
    setDeliverableUrl("")
    setError(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Complete Design Request
          </DialogTitle>
          <DialogDescription>
            Mark <span className="font-semibold">&quot;{requestTitle}&quot;</span> as
            completed. You must provide a link to the final deliverable files.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="deliverableUrl">
              Deliverable URL <span className="text-red-500">*</span>
            </Label>
            <Input
              id="deliverableUrl"
              placeholder="https://drive.google.com/..."
              value={deliverableUrl}
              onChange={(e) => setDeliverableUrl(e.target.value)}
              type="url"
            />
            <p className="text-xs text-muted-foreground">
              Paste the Google Drive link to the final design files. Make sure the link
              is accessible to anyone with the link.
            </p>
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
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Complete Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
