import { Suspense } from "react"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { requireAdminOrDeveloper } from "@/lib/auth/guards"
import { createAdminClient } from "@/lib/supabase/admin"
import { NotificationLogTable } from "@/components/admin/notification-log"
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"
import type { NotificationLogEntry } from "@/types/notification"

export const metadata = {
  title: "Notification Logs | Admin | Cyber Tech",
  description: "View notification logs and retry failed sends",
}

interface NotificationQueryResult {
  id: string
  user_id: string
  type: string
  channel: string
  title: string
  status: string
  error_message: string | null
  retry_count: number | null
  sent_at: string | null
  created_at: string
  user: { name: string; email: string } | null
}

async function getNotificationLogs(
  status?: string
): Promise<NotificationLogEntry[]> {
  const supabase = createAdminClient()

  let query = supabase
    .from("notifications")
    .select(`
      id,
      user_id,
      type,
      channel,
      title,
      status,
      error_message,
      retry_count,
      sent_at,
      created_at,
      user:profiles!notifications_user_id_fkey(name, email)
    `)
    .order("created_at", { ascending: false })
    .limit(100)

  if (status && status !== "all") {
    query = query.eq("status", status)
  }

  const { data, error } = await query

  if (error) {
    console.error("Error fetching notifications:", error)
    return []
  }

  const notifications = data as unknown as NotificationQueryResult[]

  return notifications.map((n) => ({
    id: n.id,
    userId: n.user_id,
    userName: n.user?.name ?? "Unknown",
    userEmail: n.user?.email ?? "",
    type: n.type,
    channel: n.channel,
    title: n.title,
    status: n.status,
    errorMessage: n.error_message ?? undefined,
    retryCount: n.retry_count ?? 0,
    sentAt: n.sent_at ?? undefined,
    createdAt: n.created_at,
  } as NotificationLogEntry))
}

interface NotificationsPageProps {
  searchParams: Promise<{ status?: string }>
}

export default async function NotificationsPage({
  searchParams,
}: NotificationsPageProps) {
  await requireAdminOrDeveloper()
  const params = await searchParams
  const statusFilter = params.status || "all"
  const logs = await getNotificationLogs(statusFilter)

  const stats = {
    total: logs.length,
    pending: logs.filter((l) => l.status === "pending").length,
    sent: logs.filter((l) => l.status === "sent").length,
    failed: logs.filter((l) => l.status === "failed").length,
  }

  return (
    <div className="space-y-6">
      <AdminBreadcrumb items={[{ label: "Notification Logs" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notification Logs</h1>
          <p className="text-muted-foreground">
            View notification history and retry failed sends
          </p>
        </div>
        <form action="/admin/notifications" method="get">
          <input type="hidden" name="status" value={statusFilter} />
          <Button variant="outline" type="submit">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </form>
      </div>

      <Suspense fallback={<LoadingSkeleton className="h-96" />}>
        <NotificationLogTable
          logs={logs}
          stats={stats}
          currentFilter={statusFilter}
        />
      </Suspense>
    </div>
  )
}
