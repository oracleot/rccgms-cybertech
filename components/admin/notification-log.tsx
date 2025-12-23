"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  RefreshCw,
  Mail,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { NotificationLogEntry } from "@/types/notification"
import { retryNotification, retryAllFailedNotifications } from "./actions"

interface NotificationLogTableProps {
  logs: NotificationLogEntry[]
  stats: {
    total: number
    pending: number
    sent: number
    failed: number
  }
  currentFilter: string
}

const statusConfig: Record<
  string,
  { icon: React.ReactNode; color: string; label: string }
> = {
  pending: {
    icon: <Clock className="h-4 w-4" />,
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    label: "Pending",
  },
  sent: {
    icon: <CheckCircle className="h-4 w-4" />,
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    label: "Sent",
  },
  failed: {
    icon: <XCircle className="h-4 w-4" />,
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    label: "Failed",
  },
}

const channelIcons: Record<string, React.ReactNode> = {
  email: <Mail className="h-4 w-4" />,
  sms: <MessageSquare className="h-4 w-4" />,
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function NotificationLogTable({
  logs,
  stats,
  currentFilter,
}: NotificationLogTableProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [retryingId, setRetryingId] = useState<string | null>(null)

  const handleFilterChange = (value: string) => {
    const params = new URLSearchParams()
    if (value !== "all") {
      params.set("status", value)
    }
    router.push(`/admin/notifications?${params.toString()}`)
  }

  const handleRetry = (id: string) => {
    setRetryingId(id)
    startTransition(async () => {
      const result = await retryNotification(id)
      if (result.success) {
        toast.success("Notification queued for retry")
        router.refresh()
      } else {
        toast.error(result.error || "Failed to retry")
      }
      setRetryingId(null)
    })
  }

  const handleRetryAll = () => {
    startTransition(async () => {
      const result = await retryAllFailedNotifications()
      if (result.success) {
        toast.success(`${result.count} notifications queued for retry`)
        router.refresh()
      } else {
        toast.error(result.error || "Failed to retry")
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.pending}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">
              Sent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-destructive">
              Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-destructive">
                {stats.failed}
              </div>
              {stats.failed > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetryAll}
                  disabled={isPending}
                >
                  {isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Retry All
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <Select value={currentFilter} onValueChange={handleFilterChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No notifications found
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => {
                const statusInfo = statusConfig[log.status] || statusConfig.pending

                return (
                  <TableRow key={log.id}>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge className={statusInfo.color}>
                              <span className="mr-1">{statusInfo.icon}</span>
                              {statusInfo.label}
                            </Badge>
                          </TooltipTrigger>
                          {log.errorMessage && (
                            <TooltipContent>
                              <p className="max-w-xs">{log.errorMessage}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {channelIcons[log.channel]}
                        <span className="capitalize">{log.channel}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{log.type}</span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{log.userName}</div>
                        <div className="text-sm text-muted-foreground">
                          {log.userEmail}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="line-clamp-1">{log.title}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(log.createdAt)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {log.status === "failed" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRetry(log.id)}
                          disabled={isPending && retryingId === log.id}
                        >
                          {isPending && retryingId === log.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Info */}
      <p className="text-sm text-muted-foreground">
        Showing the last {logs.length} notifications. Failed notifications can
        be retried individually or all at once.
      </p>
    </div>
  )
}
