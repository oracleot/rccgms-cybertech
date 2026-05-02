"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Star,
  Loader2,
  Filter,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface FeedbackEntry {
  id: string
  feedback_type: string
  platform: string | null
  context_used: string | null
  original_output: string
  corrected_output: string | null
  rating: number | null
  is_approved: boolean | null
  approved_at: string | null
  created_at: string
  user: { name: string } | null
}

interface MLTrainingClientProps {
  feedback: FeedbackEntry[]
}

export function MLTrainingClient({ feedback }: MLTrainingClientProps) {
  const router = useRouter()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterType, setFilterType] = useState<string>("all")

  const filtered = feedback.filter((f) => {
    const statusMatch =
      filterStatus === "all" ||
      (filterStatus === "pending" && f.is_approved === null) ||
      (filterStatus === "approved" && f.is_approved === true) ||
      (filterStatus === "rejected" && f.is_approved === false)
    const typeMatch = filterType === "all" || f.feedback_type === filterType
    return statusMatch && typeMatch
  })

  async function handleApproval(id: string, approve: boolean) {
    setPendingAction(id + (approve ? "_approve" : "_reject"))
    try {
      const res = await fetch(`/api/ai/feedback/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isApproved: approve }),
      })
      if (!res.ok) throw new Error()
      toast.success(approve ? "Approved for training" : "Entry rejected")
      router.refresh()
    } catch {
      toast.error("Failed to update entry")
    } finally {
      setPendingAction(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="caption">Caption</SelectItem>
            <SelectItem value="description">Description</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground ml-auto">{filtered.length} entries</span>
      </div>

      {/* Entries */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No feedback entries match the current filters.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => {
            const isExpanded = expandedId === entry.id
            const statusColor =
              entry.is_approved === true
                ? "border-green-200 dark:border-green-800"
                : entry.is_approved === false
                  ? "border-red-200 dark:border-red-800"
                  : "border-amber-200 dark:border-amber-800"

            return (
              <Card key={entry.id} className={cn("transition-colors", statusColor)}>
                <CardContent className="pt-4">
                  {/* Header row */}
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="capitalize text-xs">
                          {entry.feedback_type}
                        </Badge>
                        {entry.platform && (
                          <Badge variant="secondary" className="capitalize text-xs">
                            {entry.platform}
                          </Badge>
                        )}
                        {entry.is_approved === null && (
                          <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                            Pending
                          </Badge>
                        )}
                        {entry.is_approved === true && (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Approved
                          </Badge>
                        )}
                        {entry.is_approved === false && (
                          <Badge variant="destructive" className="text-xs">
                            <XCircle className="h-3 w-3 mr-1" />
                            Rejected
                          </Badge>
                        )}
                        {entry.rating !== null && (
                          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={cn(
                                  "h-3 w-3",
                                  i < (entry.rating ?? 0)
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-muted-foreground/30"
                                )}
                              />
                            ))}
                          </span>
                        )}
                        {entry.corrected_output && (
                          <Badge variant="outline" className="text-blue-600 border-blue-300 text-xs">
                            Has correction
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        By {entry.user?.name ?? "Unknown"} ·{" "}
                        {new Date(entry.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {entry.is_approved === null && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 border-green-200 hover:bg-green-50 dark:hover:bg-green-900/20 h-7 px-2"
                            onClick={() => handleApproval(entry.id, true)}
                            disabled={pendingAction !== null}
                          >
                            {pendingAction === entry.id + "_approve" ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive border-destructive/30 hover:bg-destructive/10 h-7 px-2"
                            onClick={() => handleApproval(entry.id, false)}
                            disabled={pendingAction !== null}
                          >
                            {pendingAction === entry.id + "_reject" ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="mt-3 space-y-3 pt-3 border-t">
                      {entry.context_used && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                            Context
                          </p>
                          <p className="text-sm bg-muted/50 rounded p-2">{entry.context_used}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                          Original AI Output
                        </p>
                        <p className="text-sm bg-muted/50 rounded p-2 whitespace-pre-wrap">
                          {entry.original_output}
                        </p>
                      </div>
                      {entry.corrected_output && (
                        <div>
                          <p className="text-xs font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide mb-1">
                            User Correction
                          </p>
                          <p className="text-sm bg-green-50 dark:bg-green-900/20 rounded p-2 whitespace-pre-wrap border border-green-200 dark:border-green-800">
                            {entry.corrected_output}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
