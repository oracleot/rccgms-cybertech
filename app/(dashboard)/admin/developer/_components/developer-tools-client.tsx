"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Activity,
  Database,
  Server,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Users,
  Building2,
  Package,
  CalendarDays,
  Clapperboard,
  Palette,
  Bell,
  Beaker,
  Terminal,
  Globe,
  Zap,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { TestModePanel } from "@/components/admin/test-mode-panel"

interface HealthData {
  status: "healthy" | "degraded" | "error"
  timestamp: string
  latency: {
    total: number
    database?: number
  }
  database: {
    connected: boolean
    error: string | null
  }
  tables: Record<string, number>
  recentFailedNotifications: Array<{
    id: string
    type: string
    status: string
    created_at: string
  }>
  environment: {
    nodeEnv: string
    nextRuntime: string
    vercelEnv: string
    region: string
  }
}

interface DeveloperToolsClientProps {
  currentUserEmail: string
  currentUserRole: string
  roleCounts: Record<string, number>
  totalUsers: number
  departments: Array<{ id: string; name: string }>
}

const tableIcons: Record<string, typeof Users> = {
  profiles: Users,
  departments: Building2,
  equipment: Package,
  rotas: CalendarDays,
  rundowns: Clapperboard,
  design_requests: Palette,
  notifications: Bell,
}

export function DeveloperToolsClient({
  currentUserEmail,
  currentUserRole,
  roleCounts,
  totalUsers,
  departments,
}: DeveloperToolsClientProps) {
  const [health, setHealth] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const fetchHealth = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/developer/health")
      if (res.ok) {
        const data = await res.json()
        setHealth(data)
        setLastChecked(new Date())
      }
    } catch {
      setHealth({
        status: "error",
        timestamp: new Date().toISOString(),
        latency: { total: 0 },
        database: { connected: false, error: "Failed to reach health endpoint" },
        tables: {},
        recentFailedNotifications: [],
        environment: { nodeEnv: "unknown", nextRuntime: "unknown", vercelEnv: "unknown", region: "unknown" },
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchHealth()
  }, [fetchHealth])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(fetchHealth, 30000)
    return () => clearInterval(interval)
  }, [autoRefresh, fetchHealth])

  const statusColour = health?.status === "healthy"
    ? "text-green-600 dark:text-green-400"
    : health?.status === "degraded"
    ? "text-yellow-600 dark:text-yellow-400"
    : "text-red-600 dark:text-red-400"

  const StatusIcon = health?.status === "healthy"
    ? CheckCircle2
    : health?.status === "degraded"
    ? AlertTriangle
    : XCircle

  return (
    <Tabs defaultValue="health" className="space-y-4">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="health" className="flex items-center gap-2">
          <Activity className="h-4 w-4" />
          System Health
        </TabsTrigger>
        <TabsTrigger value="database" className="flex items-center gap-2">
          <Database className="h-4 w-4" />
          Database
        </TabsTrigger>
        <TabsTrigger value="tools" className="flex items-center gap-2">
          <Beaker className="h-4 w-4" />
          Dev Tools
        </TabsTrigger>
      </TabsList>

      {/* System Health Tab */}
      <TabsContent value="health" className="space-y-4">
        {/* Status Banner */}
        <Card className={cn(
          "border-2",
          health?.status === "healthy" && "border-green-200 dark:border-green-900",
          health?.status === "degraded" && "border-yellow-200 dark:border-yellow-900",
          health?.status === "error" && "border-red-200 dark:border-red-900",
          !health && "border-muted"
        )}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {health ? (
                  <StatusIcon className={cn("h-8 w-8", statusColour)} />
                ) : (
                  <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
                )}
                <div>
                  <h2 className={cn("text-xl font-semibold", statusColour)}>
                    {health ? health.status.charAt(0).toUpperCase() + health.status.slice(1) : "Checking..."}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {lastChecked
                      ? `Last checked ${lastChecked.toLocaleTimeString()}`
                      : "Loading system status..."}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className={cn(autoRefresh && "border-violet-500 text-violet-600")}
                >
                  <Zap className="h-4 w-4 mr-1" />
                  {autoRefresh ? "Auto" : "Manual"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchHealth}
                  disabled={loading}
                >
                  <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Latency & Environment */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                Total Latency
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {health ? `${health.latency.total}ms` : "—"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Database className="h-3.5 w-3.5" />
                DB Latency
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {health?.latency.database ? `${health.latency.database}ms` : "—"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Server className="h-3.5 w-3.5" />
                Environment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold capitalize">
                {health?.environment.vercelEnv ?? "—"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                <Globe className="h-3.5 w-3.5" />
                Region
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {health?.environment.region ?? "—"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Failed Notifications */}
        {health && health.recentFailedNotifications.length > 0 && (
          <Card className="border-red-200 dark:border-red-900">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Recent Failed Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {health.recentFailedNotifications.map((notif) => (
                  <div key={notif.id} className="flex items-center justify-between rounded-md bg-red-50 dark:bg-red-950/20 p-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="text-xs">{notif.type}</Badge>
                      <span className="text-muted-foreground">{notif.id.slice(0, 8)}...</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(notif.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* Database Tab */}
      <TabsContent value="database" className="space-y-4">
        {/* Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4" />
              Database Connection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {health?.database.connected ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="font-medium text-green-600 dark:text-green-400">Connected</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="font-medium text-red-600 dark:text-red-400">
                    Disconnected: {health?.database.error}
                  </span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table Record Counts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Table Record Counts</CardTitle>
            <CardDescription>Current row counts across all major tables</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {health && Object.entries(health.tables).map(([table, count]) => {
                const Icon = tableIcons[table] ?? Database
                return (
                  <div
                    key={table}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {table.replace(/_/g, " ")}
                      </span>
                    </div>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Role Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              User Role Distribution
            </CardTitle>
            <CardDescription>{totalUsers} total users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(roleCounts).map(([role, count]) => {
                const percentage = totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0
                return (
                  <div key={role}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium capitalize">{role}</span>
                      <span className="text-sm text-muted-foreground">{count} ({percentage}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          role === "admin" && "bg-red-500",
                          role === "developer" && "bg-violet-500",
                          role === "leader" && "bg-blue-500",
                          role === "member" && "bg-green-500"
                        )}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Departments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Departments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {departments.map((dept) => (
                <Badge key={dept.id} variant="outline">{dept.name}</Badge>
              ))}
              {departments.length === 0 && (
                <p className="text-sm text-muted-foreground">No departments configured</p>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Dev Tools Tab */}
      <TabsContent value="tools" className="space-y-4">
        {/* Test Mode */}
        <TestModePanel />

        <Separator />

        {/* Session Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              Current Session
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className="font-mono">{currentUserEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Role</span>
                <Badge className={cn(
                  currentUserRole === "admin" && "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
                  currentUserRole === "developer" && "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
                  currentUserRole === "leader" && "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
                  currentUserRole === "member" && "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                )}>
                  {currentUserRole}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Node ENV</span>
                <span className="font-mono">{health?.environment.nodeEnv ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Runtime</span>
                <span className="font-mono">{health?.environment.nextRuntime ?? "—"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Quick Links</CardTitle>
            <CardDescription>Useful external resources</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2">
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border p-3 text-sm hover:bg-accent transition-colours"
              >
                <Database className="h-4 w-4 text-green-500" />
                Supabase Dashboard
              </a>
              <a
                href="https://vercel.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border p-3 text-sm hover:bg-accent transition-colours"
              >
                <Globe className="h-4 w-4 text-foreground" />
                Vercel Dashboard
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border p-3 text-sm hover:bg-accent transition-colours"
              >
                <Terminal className="h-4 w-4 text-foreground" />
                GitHub Repository
              </a>
              <a
                href="/api/admin/developer/health"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border p-3 text-sm hover:bg-accent transition-colours"
              >
                <Activity className="h-4 w-4 text-violet-500" />
                Health API (JSON)
              </a>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
