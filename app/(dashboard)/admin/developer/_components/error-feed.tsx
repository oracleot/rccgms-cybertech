"use client"

import { useState, useEffect, useCallback } from "react"
import {
  RefreshCw,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  XCircle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  SUBSYSTEM_LABELS,
  SUBSYSTEM_COLORS,
  SEVERITY_COLORS,
} from "@/lib/telemetry-constants"

interface DevEvent {
  id: number
  event_id: string
  correlation_id: string | null
  timestamp: string
  subsystem: string
  action: string
  status: string
  duration_ms: number | null
  actor_id: string | null
  metadata: Record<string, unknown>
  severity: string
}

const TIME_RANGES = [
  { label: "1h", hours: 1 },
  { label: "6h", hours: 6 },
  { label: "24h", hours: 24 },
  { label: "7d", hours: 168 },
] as const

export function ErrorFeed() {
  const [events, setEvents] = useState<DevEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [range, setRange] = useState<number>(24)

  const fetchErrors = useCallback(async () => {
    setLoading(true)
    try {
      const since = new Date(Date.now() - range * 3_600_000).toISOString()
      const [warnRes, errRes] = await Promise.all([
        fetch(`/api/admin/developer/events?severity=warn&since=${since}&limit=200`),
        fetch(`/api/admin/developer/events?severity=error&since=${since}&limit=200`),
      ])

      const warns: DevEvent[] = warnRes.ok ? (await warnRes.json()).events ?? [] : []
      const errs: DevEvent[] = errRes.ok ? (await errRes.json()).events ?? [] : []

      const combined = [...warns, ...errs].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      setEvents(combined)
    } catch {
      /* keep stale data */
    } finally {
      setLoading(false)
    }
  }, [range])

  useEffect(() => { fetchErrors() }, [fetchErrors])

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Group by subsystem
  const grouped = events.reduce<Record<string, DevEvent[]>>((acc, ev) => {
    const key = ev.subsystem
    if (!acc[key]) acc[key] = []
    acc[key].push(ev)
    return acc
  }, {})

  const errorCount = events.filter((e) => e.severity === "error").length
  const warnCount = events.filter((e) => e.severity === "warn").length

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Errors & Warnings</h3>
          {errorCount > 0 && (
            <Badge variant="destructive" className="text-xs">{errorCount} errors</Badge>
          )}
          {warnCount > 0 && (
            <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300">
              {warnCount} warnings
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border">
            {TIME_RANGES.map((r) => (
              <button
                key={r.hours}
                className={cn(
                  "px-3 py-1 text-xs transition-colors",
                  range === r.hours
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted",
                )}
                onClick={() => setRange(r.hours)}
              >
                {r.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={fetchErrors} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Content */}
      {events.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {loading ? "Loading…" : `No errors or warnings in the last ${TIME_RANGES.find((r) => r.hours === range)?.label ?? range + "h"}.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([sub, evs]) => (
          <Card key={sub}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", SUBSYSTEM_COLORS[sub])}>
                  {SUBSYSTEM_LABELS[sub] ?? sub}
                </Badge>
                <span className="text-muted-foreground">{evs.length} {evs.length === 1 ? "event" : "events"}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {evs.map((ev) => (
                  <ErrorRow
                    key={ev.id}
                    event={ev}
                    expanded={expanded.has(ev.id)}
                    onToggle={() => toggleExpand(ev.id)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}

function ErrorRow({ event: ev, expanded, onToggle }: {
  event: DevEvent
  expanded: boolean
  onToggle: () => void
}) {
  const hasMetadata = ev.metadata && Object.keys(ev.metadata).length > 0
  const ts = new Date(ev.timestamp)
  const SevIcon = ev.severity === "error" ? XCircle : AlertTriangle
  const sevColor = ev.severity === "error"
    ? "text-red-600 dark:text-red-400"
    : "text-yellow-600 dark:text-yellow-400"

  return (
    <div className="rounded-md border px-3 py-2 text-sm">
      <div className="flex items-center gap-2 cursor-pointer" onClick={onToggle}>
        {hasMetadata ? (
          expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : <div className="w-3.5" />}
        <SevIcon className={cn("h-4 w-4 shrink-0", sevColor)} />
        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", SEVERITY_COLORS[ev.severity])}>
          {ev.severity}
        </Badge>
        <span className="font-medium">{ev.action}</span>
        {ev.duration_ms != null && (
          <span className="text-xs text-muted-foreground">{ev.duration_ms}ms</span>
        )}
        <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">
          {ts.toLocaleTimeString()} {ts.toLocaleDateString()}
        </span>
      </div>
      {expanded && hasMetadata && (
        <pre className="mt-2 ml-6 p-2 rounded bg-muted text-xs overflow-auto max-h-48 whitespace-pre-wrap">
          {JSON.stringify(ev.metadata, null, 2)}
        </pre>
      )}
      {expanded && ev.correlation_id && (
        <p className="mt-1 ml-6 text-xs text-muted-foreground font-mono">
          correlation: {ev.correlation_id}
        </p>
      )}
      {expanded && ev.actor_id && (
        <p className="mt-0.5 ml-6 text-xs text-muted-foreground">
          actor: {ev.actor_id}
        </p>
      )}
    </div>
  )
}
