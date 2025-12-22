"use client"

import { useMemo, useTransition } from "react"
import { toast } from "sonner"

import { updateRundown } from "@/app/(dashboard)/rundown/actions"
import { Button } from "@/components/ui/button"
import type { RundownStatus } from "@/types/rundown"

interface RundownStatusControlsProps {
  rundownId: string
  status: RundownStatus
}

const STATUS_LABEL: Record<RundownStatus, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
}

export function RundownStatusControls({ rundownId, status }: RundownStatusControlsProps) {
  const [isPending, startTransition] = useTransition()

  const actions = useMemo(() => {
    return [
      { key: "publish", label: "Publish", next: "published" as RundownStatus, show: status !== "published" },
      { key: "draft", label: "Mark as draft", next: "draft" as RundownStatus, show: status !== "draft" },
      { key: "archive", label: "Archive", next: "archived" as RundownStatus, show: status !== "archived" },
    ].filter((action) => action.show)
  }, [status])

  const handleStatusChange = (nextStatus: RundownStatus) => {
    startTransition(async () => {
      const result = await updateRundown({ id: rundownId, status: nextStatus })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success(`Status updated to ${STATUS_LABEL[nextStatus]}`)
    })
  }

  if (actions.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <Button
          key={action.key}
          variant={action.key === "publish" ? "default" : "outline"}
          size="sm"
          disabled={isPending}
          onClick={() => handleStatusChange(action.next)}
        >
          {isPending ? "Updating..." : action.label}
        </Button>
      ))}
    </div>
  )
}