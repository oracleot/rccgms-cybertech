"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface CourseRequestActionsProps {
  requestId: string
}

export function CourseRequestActions({ requestId }: CourseRequestActionsProps) {
  const router = useRouter()
  const [isPending, setIsPending] = useState<"approve" | "reject" | null>(null)

  async function handleAction(action: "approve" | "reject") {
    setIsPending(action)
    try {
      const res = await fetch(`/api/training/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action === "approve" ? "approved" : "rejected" }),
      })
      if (!res.ok) throw new Error()
      toast.success(action === "approve" ? "Request approved" : "Request rejected")
      router.refresh()
    } catch {
      toast.error("Failed to update request")
    } finally {
      setIsPending(null)
    }
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      <Button
        size="sm"
        variant="outline"
        className="text-green-600 border-green-200 hover:bg-green-50 dark:hover:bg-green-900/20"
        onClick={() => handleAction("approve")}
        disabled={isPending !== null}
      >
        {isPending === "approve" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
        )}
        Approve
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="text-destructive border-destructive/30 hover:bg-destructive/10"
        onClick={() => handleAction("reject")}
        disabled={isPending !== null}
      >
        {isPending === "reject" ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <XCircle className="h-3.5 w-3.5 mr-1" />
        )}
        Reject
      </Button>
    </div>
  )
}
