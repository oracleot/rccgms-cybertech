import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  CalendarDays,
  Package,
  MonitorPlay,
  Users,
} from "lucide-react"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, role")
    .eq("auth_user_id", user?.id ?? "")
    .single() as { data: { id: string; name: string; role: string } | null }

  // Get upcoming rota assignments
  const { data: upcomingAssignments } = await supabase
    .from("rota_assignments")
    .select(`
      id,
      rotas (date, services (name)),
      positions (name)
    `)
    .eq("user_id", profile?.id ?? "")
    .gte("rotas.date", new Date().toISOString().split("T")[0])
    .order("rotas(date)")
    .limit(3)

  // Get stats for admin/leader
  let stats = {
    totalVolunteers: 0,
    activeEquipment: 0,
    upcomingServices: 0,
    pendingSwaps: 0,
  }

  if (profile?.role === "admin" || profile?.role === "leader") {
    const [volunteers, equipment, services, swaps] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase
        .from("equipment")
        .select("id", { count: "exact", head: true })
        .eq("status", "available"),
      supabase
        .from("rotas")
        .select("id", { count: "exact", head: true })
        .gte("date", new Date().toISOString().split("T")[0])
        .eq("status", "published"),
      supabase
        .from("swap_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
    ])

    stats = {
      totalVolunteers: volunteers.count ?? 0,
      activeEquipment: equipment.count ?? 0,
      upcomingServices: services.count ?? 0,
      pendingSwaps: swaps.count ?? 0,
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Welcome back, {profile?.name?.split(" ")[0] ?? "Volunteer"}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s happening with your tech team
        </p>
      </div>

      {(profile?.role === "admin" || profile?.role === "leader") && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Team Members
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalVolunteers}</div>
              <p className="text-xs text-muted-foreground">
                Active volunteers
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Equipment Available
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeEquipment}</div>
              <p className="text-xs text-muted-foreground">
                Ready to use
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Upcoming Services
              </CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.upcomingServices}</div>
              <p className="text-xs text-muted-foreground">
                Scheduled rotas
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Swaps
              </CardTitle>
              <MonitorPlay className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingSwaps}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting approval
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Your Upcoming Assignments</CardTitle>
            <CardDescription>
              Your next scheduled service duties
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingAssignments && upcomingAssignments.length > 0 ? (
              <ul className="space-y-3">
                {upcomingAssignments.map((assignment: {
                  id: string
                  positions?: { name: string } | null
                  rotas?: { date: string; services?: { name: string } | null } | null
                }) => (
                  <li
                    key={assignment.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">
                        {assignment.positions?.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {assignment.rotas?.services?.name}
                      </p>
                    </div>
                    <p className="text-sm">
                      {assignment.rotas?.date
                        ? new Date(assignment.rotas.date).toLocaleDateString()
                        : "TBD"}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No upcoming assignments
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks you might want to do
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <Link
                href="/rota"
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted"
              >
                <CalendarDays className="h-5 w-5" />
                <div>
                  <p className="font-medium">View Rota</p>
                  <p className="text-sm text-muted-foreground">
                    Check your schedule
                  </p>
                </div>
              </Link>
              <Link
                href="/equipment"
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted"
              >
                <Package className="h-5 w-5" />
                <div>
                  <p className="font-medium">Checkout Equipment</p>
                  <p className="text-sm text-muted-foreground">
                    Reserve gear for service
                  </p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
