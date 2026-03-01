import Link from "next/link"
import {
  Users,
  Building2,
  Bell,
  Settings,
  ArrowRight,
  UserPlus,
  MailCheck,
  AlertTriangle,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { requireAdminOrDeveloper } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"

export const metadata = {
  title: "Admin | Cyber Tech",
  description: "System administration and management",
}

interface AdminStats {
  totalUsers: number
  pendingInvites: number
  departments: number
  pendingNotifications: number
  failedNotifications: number
}

async function getAdminStats(): Promise<AdminStats> {
  const supabase = await createClient()

  const [usersResult, departmentsResult, pendingNotifResult, failedNotifResult] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("departments").select("id", { count: "exact", head: true }),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("status", "failed"),
  ])

  return {
    totalUsers: usersResult.count ?? 0,
    pendingInvites: 0, // Would need an invites table to track this
    departments: departmentsResult.count ?? 0,
    pendingNotifications: pendingNotifResult.count ?? 0,
    failedNotifications: failedNotifResult.count ?? 0,
  }
}

export default async function AdminPage() {
  const currentUser = await requireAdminOrDeveloper()
  const stats = await getAdminStats()
  const isDeveloper = currentUser.profile.role === "developer"

  const adminSections = [
    {
      title: "User Management",
      description: "Manage team members, roles, and permissions",
      icon: Users,
      href: "/admin/users",
      stats: [
        { label: "Total Users", value: stats.totalUsers },
        { label: "Pending Invites", value: stats.pendingInvites },
      ],
      actions: [
        { label: "Invite User", icon: UserPlus, href: "/admin/users?invite=true" },
      ],
    },
    {
      title: "Departments",
      description: "Configure departments and positions",
      icon: Building2,
      href: "/admin/departments",
      stats: [{ label: "Departments", value: stats.departments }],
    },
    {
      title: "Notifications",
      description: "View notification logs and retry failed sends",
      icon: Bell,
      href: "/admin/notifications",
      stats: [
        { label: "Pending", value: stats.pendingNotifications },
        { label: "Failed", value: stats.failedNotifications, variant: stats.failedNotifications > 0 ? "destructive" : "secondary" },
      ],
    },
    {
      title: "System Settings",
      description: "Application configuration and preferences",
      icon: Settings,
      href: "/admin/settings",
      disabled: true,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage users, departments, and system settings
        </p>
      </div>

      {/* Developer read-only mode banner */}
      {isDeveloper && (
        <Card className="border-blue-500/50 bg-blue-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <Settings className="h-5 w-5" />
              Developer Mode (Read-Only)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              You have read-only access to admin features. You can view users, system logs, and technical settings, but cannot modify user accounts or critical system settings.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Alert for failed notifications */}
      {stats.failedNotifications > 0 && (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Failed Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {stats.failedNotifications} notification{stats.failedNotifications !== 1 ? "s" : ""} failed to send
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/notifications?status=failed">
                Review & Retry
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Admin Sections Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {adminSections.map((section) => (
          <Card key={section.title} className={section.disabled ? "opacity-50" : ""}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <section.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{section.title}</CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {section.stats && (
                <div className="flex flex-wrap gap-2">
                  {section.stats.map((stat) => (
                    <Badge
                      key={stat.label}
                      variant={(stat as { variant?: "default" | "secondary" | "destructive" }).variant || "secondary"}
                    >
                      {stat.label}: {stat.value}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                {section.actions?.map((action) => (
                  <Button key={action.label} variant="outline" size="sm" asChild>
                    <Link href={action.href}>
                      <action.icon className="mr-2 h-4 w-4" />
                      {action.label}
                    </Link>
                  </Button>
                ))}
                {!section.disabled && (
                  <Button variant="ghost" size="sm" asChild className="ml-auto">
                    <Link href={section.href}>
                      View All
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                )}
                {section.disabled && (
                  <Badge variant="outline" className="ml-auto">
                    Coming Soon
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MailCheck className="h-5 w-5" />
            Notification Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.pendingNotifications}</div>
              <div className="text-sm text-muted-foreground">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">{stats.failedNotifications}</div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </div>
            <div className="text-center">
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/notifications">View Logs</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
