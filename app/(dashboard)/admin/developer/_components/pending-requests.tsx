"use client"

import { useState, useEffect, useCallback } from "react"
import { Building2, Church, Check, X, RefreshCw, MapPin, Mail, Clock } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type RequestType = "organisation" | "parish"

interface Requester {
  id: string
  name: string | null
  email: string | null
}

interface OrgRequest {
  id: string
  name: string
  short_name: string | null
  created_at: string
  requester: Requester | null
}

interface ParishRequest {
  id: string
  organisation_id: string | null
  organisation_name: string | null
  parish_name: string
  locality: string | null
  region: string | null
  country: string
  created_at: string
  requester: Requester | null
  organisation: { id: string; name: string; status: string } | null
}

function RequesterLine({ requester }: { requester: Requester | null }) {
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <Mail className="h-3 w-3" />
      {requester?.name ?? "Unknown user"}
      {requester?.email ? ` (${requester.email})` : ""}
    </span>
  )
}

function ReviewControls({
  busy,
  onApprove,
  onDecline,
}: {
  busy: boolean
  onApprove: (note: string) => void
  onDecline: (note: string) => void
}) {
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="mt-3 space-y-2">
      <Textarea
        value={note}
        onChange={(e) => {
          setNote(e.target.value)
          setError(null)
        }}
        placeholder="Reviewer note (optional for approve, required to decline)"
        className="min-h-[60px] text-sm"
        disabled={busy}
      />
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" disabled={busy} onClick={() => onApprove(note.trim())}>
          <Check className="h-4 w-4 mr-1" />
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          className="text-red-600 hover:text-red-700"
          onClick={() => {
            if (!note.trim()) {
              setError("A note is required to decline a request.")
              return
            }
            onDecline(note.trim())
          }}
        >
          <X className="h-4 w-4 mr-1" />
          Decline
        </Button>
      </div>
    </div>
  )
}

export function PendingRequests() {
  const [orgRequests, setOrgRequests] = useState<OrgRequest[]>([])
  const [parishRequests, setParishRequests] = useState<ParishRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null)

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/developer/requests")
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        setOrgRequests(data.organisation_requests ?? [])
        setParishRequests(data.parish_requests ?? [])
      } else {
        setMessage({ kind: "error", text: data.error ?? "Failed to load requests" })
      }
    } catch {
      setMessage({ kind: "error", text: "Failed to load requests" })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    fetchRequests()
  }, [fetchRequests])

  const review = async (
    type: RequestType,
    id: string,
    action: "approve" | "decline",
    notes: string,
  ) => {
    setBusyId(id)
    setMessage(null)
    try {
      const res = await fetch("/api/admin/developer/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id, action, notes: notes || undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage({ kind: "error", text: data.error ?? "Action failed" })
      } else {
        setMessage({
          kind: "ok",
          text: `Request ${action === "approve" ? "approved" : "declined"}.`,
        })
        await fetchRequests()
      }
    } catch {
      setMessage({ kind: "error", text: "Action failed" })
    } finally {
      setBusyId(null)
    }
  }

  const total = orgRequests.length + parishRequests.length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Requests
              {total > 0 && <Badge variant="secondary">{total}</Badge>}
            </CardTitle>
            <CardDescription>
              Organisation and parish requests awaiting review. Approving a parish makes the
              requester its first parish admin.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchRequests} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {message && (
          <div
            role="status"
            className={cn(
              "rounded-md border px-3 py-2 text-sm",
              message.kind === "ok"
                ? "border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/20 dark:text-green-300"
                : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300",
            )}
          >
            {message.text}
          </div>
        )}

        <section className="space-y-2">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4 text-violet-500" />
            Organisation requests ({orgRequests.length})
          </h3>
          {loading && orgRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : orgRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending organisation requests</p>
          ) : (
            orgRequests.map((r) => (
              <div key={r.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{r.name}</p>
                    {r.short_name && (
                      <p className="text-xs text-muted-foreground">Denomination: {r.short_name}</p>
                    )}
                    <RequesterLine requester={r.requester} />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Submitted {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </div>
                <ReviewControls
                  busy={busyId === r.id}
                  onApprove={(n) => review("organisation", r.id, "approve", n)}
                  onDecline={(n) => review("organisation", r.id, "decline", n)}
                />
              </div>
            ))
          )}
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Church className="h-4 w-4 text-blue-500" />
            Parish requests ({parishRequests.length})
          </h3>
          {loading && parishRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : parishRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending parish requests</p>
          ) : (
            parishRequests.map((r) => {
              const orgName = r.organisation?.name ?? r.organisation_name ?? "Unknown organisation"
              const orgReady = !!r.organisation_id && r.organisation?.status === "active"
              const location = [r.locality, r.region, r.country].filter(Boolean).join(", ")
              return (
                <div key={r.id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{r.parish_name}</p>
                      <p className="text-xs text-muted-foreground">{orgName}</p>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {location}
                      </span>
                      <RequesterLine requester={r.requester} />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Submitted {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {!orgReady && (
                    <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                      The organisation is not yet active. Approve its organisation request before
                      approving this parish.
                    </p>
                  )}
                  <ReviewControls
                    busy={busyId === r.id}
                    onApprove={(n) => review("parish", r.id, "approve", n)}
                    onDecline={(n) => review("parish", r.id, "decline", n)}
                  />
                </div>
              )
            })
          )}
        </section>
      </CardContent>
    </Card>
  )
}
