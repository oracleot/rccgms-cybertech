"use client"

import { useState, useEffect, useCallback } from "react"
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Radio,
  Users,
  Zap,
  Clock,
  Database,
  Globe,
  GitCommit,
  ExternalLink,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface OverviewData {
  status: "healthy" | "degraded" | "error"
  timestamp: string
  latency: { total: number; database?: number }
  database: { connected: boolean; error: string | null }
  tables: Record<string, number>
  environment: { nodeEnv: string; nextRuntime: string; vercelEnv: string; region: string }
  broadcastRooms?: number
  lyricSets?: number
  gitSha?: string
  eventSummary?: { events_24h: number; errors_24h: number; events_1h: number; slowest_1h_ms: number | null }
}

export function SystemOverview() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/developer/health")
      if (res.ok) setData(await res.json())
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(fetchData, 30_000)
    return () => clearInterval(id)
  }, [autoRefresh, fetchData])

  const StatusIcon = data?.status === "healthy" ? CheckCircle2
    : data?.status === "degraded" ? AlertTriangle : XCircle
  const statusColor = data?.status === "healthy" ? "text-green-600 dark:text-green-400"
    : data?.status === "degraded" ? "text-yellow-600 dark:text-yellow-400"
    : "text-red-600 dark:text-red-400"

  return (
    <div className="space-y-4">
      {/* Top controls */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">System Overview</h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? "Auto: On" : "Auto: Off"}
          </Button>
        </div>
      </div>

      {/* Status banner */}
      <Card className={cn(
        "border-2",
        data?.status === "healthy" && "border-green-200 dark:border-green-900",
        data?.status === "degraded" && "border-yellow-200 dark:border-yellow-900",
        data?.status === "error" && "border-red-200 dark:border-red-900",
        !data && "border-muted",
      )}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            {data ? (
              <StatusIcon className={cn("h-8 w-8", statusColor)} />
            ) : (
              <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
            )}
            <div>
              <h2 className={cn("text-xl font-semibold", statusColor)}>
                {data ? `System ${data.status}` : "Loading…"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {data ? new Date(data.timestamp).toLocaleString() : ""}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics grid */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <MetricCard
          icon={Clock}
          label="Response latency"
          value={data ? `${data.latency.total}ms` : "—"}
          sub={data?.latency.database != null ? `DB: ${data.latency.database}ms` : undefined}
        />
        <MetricCard
          icon={Database}
          label="Database"
          value={data?.database.connected ? "Connected" : "Down"}
          sub={data?.database.error ?? undefined}
          ok={data?.database.connected}
        />
        <MetricCard
          icon={Radio}
          label="Broadcast rooms"
          value={data?.broadcastRooms != null ? String(data.broadcastRooms) : "—"}
        />
        <MetricCard
          icon={Users}
          label="Total users"
          value={data?.tables.profiles != null ? String(data.tables.profiles) : "—"}
        />
        <MetricCard
          icon={Zap}
          label="Events (24h)"
          value={data?.eventSummary ? String(data.eventSummary.events_24h) : "—"}
          sub={data?.eventSummary ? `${data.eventSummary.events_1h} last hour` : undefined}
        />
        <MetricCard
          icon={AlertTriangle}
          label="Errors (24h)"
          value={data?.eventSummary ? String(data.eventSummary.errors_24h) : "—"}
          ok={data?.eventSummary ? data.eventSummary.errors_24h === 0 : undefined}
        />
        <MetricCard
          icon={Globe}
          label="Environment"
          value={data?.environment.vercelEnv || data?.environment.nodeEnv || "—"}
          sub={data?.environment.region ? `Region: ${data.environment.region}` : undefined}
        />
        <MetricCard
          icon={GitCommit}
          label="Git SHA"
          value={data?.gitSha ? data.gitSha.slice(0, 7) : "—"}
          sub={data?.gitSha ? data.gitSha : undefined}
          mono
        />
      </div>

      {/* OBS Controls */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">OBS Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <a href="/lyrics/obs/dock" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors">
              Lyrics Dock <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            </a>
            <a href="/bible/obs/dock" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors">
              Bible Dock <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Table row counts */}
      {data?.tables && Object.keys(data.tables).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Table record counts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
              {Object.entries(data.tables).map(([name, count]) => (
                <div key={name} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span className="text-muted-foreground">{name}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function MetricCard({ icon: Icon, label, value, sub, ok, mono }: {
  icon: typeof Clock
  label: string
  value: string
  sub?: string
  ok?: boolean
  mono?: boolean
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className={cn(
          "text-lg font-semibold",
          mono && "font-mono text-sm",
          ok === true && "text-green-600 dark:text-green-400",
          ok === false && "text-red-600 dark:text-red-400",
        )}>
          {value}
        </p>
        {sub && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate" title={sub}>{sub}</p>
        )}
      </CardContent>
    </Card>
  )
}
