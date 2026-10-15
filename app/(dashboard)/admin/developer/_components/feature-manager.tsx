"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Shield,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Inbox,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Feature {
  id: string
  slug: string
  name: string
  description: string | null
  category: string
  is_default: boolean
  entitlement?: {
    id: string
    enabled: boolean
    granted_at: string
    expires_at: string | null
  } | null
}

interface Parish {
  id: string
  name: string
  spiritual_expression: string | null
  organisation_name: string | null
}

interface AccessRequest {
  id: string
  parish_id: string
  feature_id: string
  requested_by: string
  status: string
  notes: string | null
  created_at: string
  features?: { slug: string; name: string } | null
  parishes?: { name: string } | null
}

export function FeatureManager() {
  const [parishes, setParishes] = useState<Parish[]>([])
  const [selectedParish, setSelectedParish] = useState<string | null>(null)
  const [features, setFeatures] = useState<Feature[]>([])
  const [requests, setRequests] = useState<AccessRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [requestsExpanded, setRequestsExpanded] = useState(true)
  const [reviewingId, setReviewingId] = useState<string | null>(null)

  const fetchParishes = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/developer/parishes")
      if (res.ok) {
        const data = await res.json()
        const list: Parish[] = (data.parishes ?? []).map((p: Record<string, unknown>) => ({
          id: p.id,
          name: p.name,
          spiritual_expression: p.spiritual_expression,
          organisation_name: null,
        }))
        setParishes(list)
        if (list.length > 0 && !selectedParish) {
          setSelectedParish(list[0].id)
        }
      }
    } catch {
      // silent
    }
  }, [selectedParish])

  const fetchFeatures = useCallback(async () => {
    if (!selectedParish) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/developer/features?parish_id=${selectedParish}`)
      if (res.ok) {
        const data = await res.json()
        setFeatures(data.features ?? [])
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [selectedParish])

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/developer/features/requests?status=pending")
      if (res.ok) {
        const data = await res.json()
        setRequests(data.requests ?? [])
      }
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    fetchParishes()
    fetchRequests()
  }, [fetchParishes, fetchRequests])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    fetchFeatures()
  }, [fetchFeatures])

  const toggleFeature = async (featureId: string, currentlyEnabled: boolean) => {
    if (!selectedParish) return
    setTogglingId(featureId)
    try {
      await fetch("/api/admin/developer/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parish_id: selectedParish,
          feature_id: featureId,
          enabled: !currentlyEnabled,
        }),
      })
      await fetchFeatures()
    } catch {
      // silent
    } finally {
      setTogglingId(null)
    }
  }

  const reviewRequest = async (requestId: string, status: "approved" | "declined") => {
    setReviewingId(requestId)
    try {
      await fetch("/api/admin/developer/features/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "review",
          request_id: requestId,
          status,
        }),
      })
      await fetchRequests()
      await fetchFeatures()
    } catch {
      // silent
    } finally {
      setReviewingId(null)
    }
  }

  const categoryColor = (cat: string) => {
    switch (cat) {
      case "core":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "module":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "admin":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
      case "platform":
        return "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200"
      default:
        return ""
    }
  }

  return (
    <div className="space-y-4">
      {/* Pending Requests */}
      {requests.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-2">
            <button
              className="flex items-center justify-between w-full text-left"
              onClick={() => setRequestsExpanded(!requestsExpanded)}
            >
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Inbox className="h-4 w-4 text-amber-500" />
                Pending Feature Requests
                <Badge variant="secondary" className="text-xs">
                  {requests.length}
                </Badge>
              </CardTitle>
              {requestsExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          </CardHeader>
          {requestsExpanded && (
            <CardContent>
              <div className="space-y-2">
                {requests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div className="space-y-1">
                      <div className="text-sm font-medium">
                        {req.features?.name ?? req.feature_id.slice(0, 8)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {req.parishes?.name ?? req.parish_id.slice(0, 8)}
                        {req.notes && (
                          <span className="ml-2 flex items-center gap-1 inline-flex">
                            <MessageSquare className="h-3 w-3" />
                            {req.notes}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(req.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 hover:text-green-700 h-7 text-xs"
                        disabled={reviewingId === req.id}
                        onClick={() => reviewRequest(req.id, "approved")}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700 h-7 text-xs"
                        disabled={reviewingId === req.id}
                        onClick={() => reviewRequest(req.id, "declined")}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Feature Entitlements */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Feature Entitlements
              </CardTitle>
              <CardDescription>Manage which features each parish can access</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchFeatures()
                fetchRequests()
              }}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Parish selector */}
          <div className="mb-4">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Select Parish
            </label>
            <select
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={selectedParish ?? ""}
              onChange={(e) => setSelectedParish(e.target.value || null)}
            >
              <option value="">Select a parish...</option>
              {parishes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.spiritual_expression ? ` — ${p.spiritual_expression}` : ""}
                </option>
              ))}
            </select>
          </div>

          {!selectedParish ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Select a parish to manage its features
            </div>
          ) : loading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading...</div>
          ) : (
            <div className="space-y-2">
              {features.map((feature) => {
                const isEnabled =
                  feature.is_default ||
                  (feature.entitlement?.enabled === true &&
                    (!feature.entitlement?.expires_at ||
                      new Date(feature.entitlement.expires_at) >= new Date()))

                return (
                  <div
                    key={feature.id}
                    className={cn(
                      "flex items-center justify-between rounded-md border p-3 transition-colors",
                      isEnabled ? "border-green-200/50 dark:border-green-900/50" : "border-muted",
                    )}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{feature.name}</span>
                        <Badge className={cn("text-[10px] py-0", categoryColor(feature.category))}>
                          {feature.category}
                        </Badge>
                        {feature.is_default && (
                          <Badge variant="secondary" className="text-[10px] py-0">
                            default
                          </Badge>
                        )}
                      </div>
                      {feature.description && (
                        <p className="text-xs text-muted-foreground">{feature.description}</p>
                      )}
                      {feature.entitlement?.granted_at && (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Granted {new Date(feature.entitlement.granted_at).toLocaleDateString()}
                          {feature.entitlement.expires_at && (
                            <span>
                              {" "}
                              · Expires{" "}
                              {new Date(feature.entitlement.expires_at).toLocaleDateString()}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                    <div>
                      {feature.is_default ? (
                        <div className="text-xs text-muted-foreground italic">Always on</div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={togglingId === feature.id}
                          onClick={() => toggleFeature(feature.id, isEnabled)}
                          className={cn(
                            "h-8",
                            isEnabled
                              ? "text-green-600 hover:text-green-700"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {isEnabled ? (
                            <ToggleRight className="h-5 w-5 mr-1" />
                          ) : (
                            <ToggleLeft className="h-5 w-5 mr-1" />
                          )}
                          {isEnabled ? "Enabled" : "Disabled"}
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
