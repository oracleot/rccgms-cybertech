"use client"

import { useState, useEffect, useCallback } from "react"
import {
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Search,
  Zap,
  AlertTriangle,
  Clock,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  SUBSYSTEM_LABELS,
  SUBSYSTEM_COLORS,
  SEVERITY_COLORS,
  STATUS_COLORS,
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

interface SummaryData {
  totals: {
    events_1h: number
    events_24h: number
    errors_24h: number
    slowest_1h_ms: number | null
  }
}

const SUBSYSTEM_OPTIONS = [
  "", "worship", "bible", "storage", "auth", "api", "system",
  "rota", "rundown", "designs", "notifications", "meetings", "training", "livestream",
]

const SEVERITY_OPTIONS = ["", "debug", "info", "warn", "error"]

export function ActivityFeed() {
  const [events, setEvents] = useState<DevEvent[]>([])
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [subsystem, setSubsystem] = useState("")
  const [severity, setSeverity] = useState("")
  const [search, setSearch] = useState("")
  const [correlationSearch, setCorrelationSearch] = useState("")
  const [correlationEvents, setCorrelationEvents] = useState<DevEvent[] | null>(null)

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("limit", "50")
      if (subsystem) params.set("subsystem", subsystem)
      if (severity) params.set("severity", severity)
      if (search) params.set("search", search)

      const [evRes, sumRes] = await Promise.all([
        fetch(`/api/admin/developer/events?${params}`),
        fetch("/api/admin/developer/events/summary"),
      ])
      if (evRes.ok) {
        const d = await evRes.json()
        setEvents(d.events ?? [])
      }
      if (sumRes.ok) {
        setSummary(await sumRes.json())
      }
    } catch {
      /* network error — keep stale data */
    } finally {
      setLoading(false)
    }
  }, [subsystem, severity, search])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(fetchEvents, 30_000)
    return () => clearInterval(id)
  }, [autoRefresh, fetchEvents])

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const searchCorrelation = async () => {
    if (!correlationSearch.trim()) return
    try {
      const res = await fetch(`/api/admin/developer/events/${encodeURIComponent(correlationSearch.trim())}`)
      if (res.ok) {
        const d = await res.json()
        setCorrelationEvents(d.events ?? [])
      }
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <SummaryCard
          icon={Zap}
          label="Events (1h)"
          value={summary?.totals.events_1h ?? "—"}
        />
        <SummaryCard
          icon={Zap}
          label="Events (24h)"
          value={summary?.totals.events_24h ?? "—"}
        />
        <SummaryCard
          icon={AlertTriangle}
          label="Errors (24h)"
          value={summary?.totals.errors_24h ?? "—"}
          error={(summary?.totals.errors_24h ?? 0) > 0}
        />
        <SummaryCard
          icon={Clock}
          label="Slowest (1h)"
          value={summary?.totals.slowest_1h_ms != null ? `${summary.totals.slowest_1h_ms}ms` : "—"}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="rounded-md border bg-background px-3 py-1.5 text-sm"
          value={subsystem}
          onChange={(e) => setSubsystem(e.target.value)}
        >
          <option value="">All subsystems</option>
          {SUBSYSTEM_OPTIONS.filter(Boolean).map((s) => (
            <option key={s} value={s}>{SUBSYSTEM_LABELS[s] ?? s}</option>
          ))}
        </select>
        <select
          className="rounded-md border bg-background px-3 py-1.5 text-sm"
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
        >
          <option value="">All severities</option>
          {SEVERITY_OPTIONS.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search actions…"
            className="pl-8 h-8 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchEvents()}
          />
        </div>
        <Button variant="outline" size="sm" onClick={fetchEvents} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
          Refresh
        </Button>
        <Button
          variant={autoRefresh ? "default" : "outline"}
          size="sm"
          onClick={() => setAutoRefresh(!autoRefresh)}
        >
          {autoRefresh ? "Live" : "Live: Off"}
        </Button>
      </div>

      {/* Correlation ID search */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Trace by correlation ID</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter correlation UUID…"
              className="h-8 text-sm font-mono"
              value={correlationSearch}
              onChange={(e) => setCorrelationSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchCorrelation()}
            />
            <Button variant="outline" size="sm" onClick={searchCorrelation}>
              Trace
            </Button>
            {correlationEvents && (
              <Button variant="ghost" size="sm" onClick={() => setCorrelationEvents(null)}>
                Clear
              </Button>
            )}
          </div>
          {correlationEvents && (
            <div className="mt-3 space-y-1">
              {correlationEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No events found for this correlation ID.</p>
              ) : (
                correlationEvents.map((ev) => <EventRow key={ev.id} event={ev} expanded={expanded.has(ev.id)} onToggle={() => toggleExpand(ev.id)} />)
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Event list */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Recent events {events.length > 0 && <span className="text-muted-foreground">({events.length})</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {loading ? "Loading…" : "No events yet. Events will appear as the system is used."}
            </p>
          ) : (
            <div className="space-y-1">
              {events.map((ev) => (
                <EventRow
                  key={ev.id}
                  event={ev}
                  expanded={expanded.has(ev.id)}
                  onToggle={() => toggleExpand(ev.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function EventRow({ event: ev, expanded, onToggle }: {
  event: DevEvent
  expanded: boolean
  onToggle: () => void
}) {
  const hasMetadata = ev.metadata && Object.keys(ev.metadata).length > 0
  const ts = new Date(ev.timestamp)

  return (
    <div className="rounded-md border px-3 py-2 text-sm">
      <div className="flex items-center gap-2 cursor-pointer" onClick={onToggle}>
        {hasMetadata ? (
          expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : <div className="w-3.5" />}
        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", SUBSYSTEM_COLORS[ev.subsystem])}>
          {SUBSYSTEM_LABELS[ev.subsystem] ?? ev.subsystem}
        </Badge>
        <span className="font-medium">{ev.action}</span>
        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", SEVERITY_COLORS[ev.severity])}>
          {ev.severity}
        </Badge>
        <span className={cn("text-xs", STATUS_COLORS[ev.status] ?? "text-muted-foreground")}>
          {ev.status}
        </span>
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
    </div>
  )
}

function SummaryCard({ icon: Icon, label, value, error }: {
  icon: typeof Zap
  label: string
  value: string | number
  error?: boolean
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={cn("h-4 w-4", error ? "text-red-500" : "text-muted-foreground")} />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className={cn("text-lg font-semibold", error && "text-red-600 dark:text-red-400")}>
          {value}
        </p>
      </CardContent>
    </Card>
  )
}
