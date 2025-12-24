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
  Sparkles,
  ArrowRight,
} from "lucide-react"
import { BlurFade } from "@/components/ui/blur-fade"
import { NumberTicker } from "@/components/ui/number-ticker"

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

  const firstName = profile?.name?.split(" ")[0] ?? "Volunteer"

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <BlurFade delay={0.1} inView>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600/10 via-indigo-600/5 to-transparent border border-violet-500/10 p-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-violet-500/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-5 w-5 text-violet-500" />
              <span className="text-sm font-medium text-violet-400">Dashboard</span>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              Welcome back, {firstName}
            </h1>
            <p className="text-muted-foreground mt-1">
              Here&apos;s what&apos;s happening with your tech team
            </p>
          </div>
        </div>
      </BlurFade>

      {(profile?.role === "admin" || profile?.role === "leader") && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <BlurFade delay={0.15} inView>
            <Card className="relative overflow-hidden group hover:border-violet-500/30 transition-colors">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Team Members
                </CardTitle>
                <div className="p-2 rounded-lg bg-violet-500/10">
                  <Users className="h-4 w-4 text-violet-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <NumberTicker value={stats.totalVolunteers} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Active volunteers
                </p>
              </CardContent>
            </Card>
          </BlurFade>
          <BlurFade delay={0.2} inView>
            <Card className="relative overflow-hidden group hover:border-green-500/30 transition-colors">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Equipment Available
                </CardTitle>
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Package className="h-4 w-4 text-green-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <NumberTicker value={stats.activeEquipment} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Ready to use
                </p>
              </CardContent>
            </Card>
          </BlurFade>
          <BlurFade delay={0.25} inView>
            <Card className="relative overflow-hidden group hover:border-blue-500/30 transition-colors">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Upcoming Services
                </CardTitle>
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <CalendarDays className="h-4 w-4 text-blue-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <NumberTicker value={stats.upcomingServices} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Scheduled rotas
                </p>
              </CardContent>
            </Card>
          </BlurFade>
          <BlurFade delay={0.3} inView>
            <Card className={`relative overflow-hidden group transition-colors ${
              stats.pendingSwaps > 0 
                ? "border-amber-500/30 hover:border-amber-500/50" 
                : "hover:border-amber-500/30"
            }`}>
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              {stats.pendingSwaps > 0 && (
                <div className="absolute top-2 right-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                </div>
              )}
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Pending Swaps
                </CardTitle>
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <MonitorPlay className="h-4 w-4 text-amber-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <NumberTicker value={stats.pendingSwaps} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Awaiting approval
                </p>
              </CardContent>
            </Card>
          </BlurFade>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <BlurFade delay={0.35} inView>
          <Card className="h-full">
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
                  }, index: number) => (
                    <BlurFade key={assignment.id} delay={0.4 + index * 0.05} inView>
                      <li
                        className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors group"
                      >
                        <div>
                          <p className="font-medium group-hover:text-violet-500 transition-colors">
                            {assignment.positions?.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {assignment.rotas?.services?.name}
                          </p>
                        </div>
                        <p className="text-sm font-medium">
                          {assignment.rotas?.date
                            ? new Date(assignment.rotas.date).toLocaleDateString("en-GB", {
                                weekday: "short",
                                day: "numeric",
                                month: "short"
                              })
                            : "TBD"}
                        </p>
                      </li>
                    </BlurFade>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="p-3 rounded-full bg-muted mb-3">
                    <CalendarDays className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    No upcoming assignments
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </BlurFade>

        <BlurFade delay={0.4} inView>
          <Card className="h-full">
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
                  className="flex items-center gap-3 rounded-lg border p-3 transition-all hover:bg-violet-500/5 hover:border-violet-500/30 group"
                >
                  <div className="p-2 rounded-lg bg-violet-500/10 group-hover:bg-violet-500/20 transition-colors">
                    <CalendarDays className="h-5 w-5 text-violet-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium group-hover:text-violet-500 transition-colors">View Rota</p>
                    <p className="text-sm text-muted-foreground">
                      Check your schedule
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-violet-500 group-hover:translate-x-1 transition-all" />
                </Link>
                <Link
                  href="/equipment"
                  className="flex items-center gap-3 rounded-lg border p-3 transition-all hover:bg-green-500/5 hover:border-green-500/30 group"
                >
                  <div className="p-2 rounded-lg bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
                    <Package className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium group-hover:text-green-500 transition-colors">Checkout Equipment</p>
                    <p className="text-sm text-muted-foreground">
                      Reserve gear for service
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-green-500 group-hover:translate-x-1 transition-all" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </BlurFade>
      </div>
    </div>
  )
}
