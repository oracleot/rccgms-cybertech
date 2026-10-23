import Link from "next/link"
import { ArrowRight, BookOpen, CalendarDays, CheckCircle2, Clapperboard, Clock3, MonitorPlay, Users, Video } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ROUTES } from "@/lib/constants"
import { createClient } from "@/lib/supabase/server"

type Assignment = {
  id: string
  positions?: { name: string } | null
  rotas?: { date: string; services?: { name: string } | null } | null
}

const quickActions = [
  { title: "Check the rota", description: "Review duties and availability", href: ROUTES.ROTA, icon: CalendarDays },
  { title: "Prepare Bible output", description: "Select scripture for presentation", href: ROUTES.BIBLE, icon: BookOpen },
  { title: "Build a rundown", description: "Order the service from start to finish", href: ROUTES.RUNDOWN, icon: Clapperboard },
]

function formatDate(value?: string) {
  if (!value) return "Date to be confirmed"
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, role")
    .eq("auth_user_id", user?.id ?? "")
    .single() as { data: { id: string; name: string; role: string } | null }

  const { data: upcomingAssignments } = await supabase
    .from("rota_assignments")
    .select(`id, rotas (date, services (name)), positions (name)`)
    .eq("user_id", profile?.id ?? "")
    .gte("rotas.date", new Date().toISOString().split("T")[0])
    .order("rotas(date)")
    .limit(3)

  const canManage = ["admin", "lead_developer", "developer", "leader"].includes(profile?.role ?? "")
  const canManageMeetings = ["admin", "lead_developer", "leader"].includes(profile?.role ?? "")
  let stats = { totalMembers: 0, upcomingServices: 0, pendingSwaps: 0 }

  if (canManage) {
    const [members, services, swaps] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("rotas").select("id", { count: "exact", head: true }).gte("date", new Date().toISOString().split("T")[0]).eq("status", "published"),
      supabase.from("swap_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ])
    stats = { totalMembers: members.count ?? 0, upcomingServices: services.count ?? 0, pendingSwaps: swaps.count ?? 0 }
  }

  const assignments = (upcomingAssignments ?? []) as Assignment[]
  const nextAssignment = assignments[0]
  const firstName = profile?.name?.split(" ")[0] ?? "Member"
  const dashboardActions = [
    ...quickActions,
    canManageMeetings
      ? { title: "Arrange a meeting", description: "Create a meeting and email attendees", href: ROUTES.MEETINGS_NEW, icon: Video }
      : { title: "View meetings", description: "Review invitations and respond", href: ROUTES.MEETINGS, icon: Video },
  ]

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      <header className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-violet-600 dark:text-violet-300">Today in Fusion</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Welcome back, {firstName}</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">See what needs your attention and move the next service forward.</p>
        </div>
        {profile?.role && <Badge variant="secondary" className="w-fit capitalize">{profile.role.replace("_", " ")}</Badge>}
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <Card className="overflow-hidden border-violet-200/70 shadow-sm dark:border-violet-900/70">
          <CardHeader className="border-b bg-violet-50/60 dark:bg-violet-950/25">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardDescription className="font-medium text-violet-700 dark:text-violet-300">Your next service</CardDescription>
                <CardTitle className="mt-1 text-2xl">{nextAssignment?.rotas?.services?.name ?? "You have no upcoming assignment"}</CardTitle>
              </div>
              <div className="rounded-xl border bg-background p-3 shadow-sm"><CalendarDays className="size-5 text-violet-600" /></div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {nextAssignment ? (
              <>
                <div className="grid gap-5 p-6 sm:grid-cols-2">
                  <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">When</p><p className="mt-2 font-medium">{formatDate(nextAssignment.rotas?.date)}</p></div>
                  <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your position</p><p className="mt-2 font-medium">{nextAssignment.positions?.name ?? "Position to be confirmed"}</p></div>
                </div>
                <div className="flex flex-col gap-3 border-t bg-muted/30 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 className="size-4 text-emerald-600" /> Assignment is on your rota</span>
                  <Link href={ROUTES.ROTA} className="inline-flex min-h-10 items-center gap-2 font-medium text-violet-700 hover:text-violet-900 dark:text-violet-300">View full rota <ArrowRight className="size-4" /></Link>
                </div>
              </>
            ) : (
              <div className="p-8">
                <p className="text-muted-foreground">When you are assigned to a service, the date and your position will appear here.</p>
                <Link href={ROUTES.ROTA} className="mt-5 inline-flex min-h-10 items-center gap-2 font-medium text-violet-700 dark:text-violet-300">Open the rota <ArrowRight className="size-4" /></Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader><CardTitle className="text-lg">Coming up</CardTitle><CardDescription>Your next three assignments</CardDescription></CardHeader>
          <CardContent>
            {assignments.length ? (
              <ol className="space-y-1">
                {assignments.map((assignment, index) => (
                  <li key={assignment.id} className="flex gap-3 border-b py-3 last:border-0">
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">{index + 1}</span>
                    <div className="min-w-0"><p className="truncate text-sm font-medium">{assignment.positions?.name ?? "Position pending"}</p><p className="mt-0.5 text-xs text-muted-foreground">{formatDate(assignment.rotas?.date)}</p></div>
                  </li>
                ))}
              </ol>
            ) : <p className="py-6 text-sm text-muted-foreground">Nothing is scheduled for you yet.</p>}
          </CardContent>
        </Card>
      </section>

      {canManage && (
        <section aria-labelledby="attention-title">
          <div className="mb-3 flex items-end justify-between gap-4">
            <div><h2 id="attention-title" className="text-xl font-semibold">Team overview</h2><p className="text-sm text-muted-foreground">Live planning signals for leaders.</p></div>
            <Link href={ROUTES.ADMIN} className="text-sm font-medium text-violet-700 dark:text-violet-300">Open admin</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Team members", value: stats.totalMembers, helper: "people in Fusion", icon: Users },
              { label: "Upcoming services", value: stats.upcomingServices, helper: "published rotas", icon: CalendarDays },
              { label: "Pending swaps", value: stats.pendingSwaps, helper: stats.pendingSwaps ? "need a decision" : "nothing waiting", icon: MonitorPlay },
            ].map((item) => (
              <Card key={item.label} className="shadow-none"><CardContent className="flex items-center gap-4 p-5"><span className="rounded-xl bg-muted p-3"><item.icon className="size-5 text-violet-600" /></span><div><p className="text-2xl font-semibold tabular-nums">{item.value}</p><p className="text-sm font-medium">{item.label}</p><p className="text-xs text-muted-foreground">{item.helper}</p></div></CardContent></Card>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="quick-actions-title">
        <div className="mb-3"><h2 id="quick-actions-title" className="text-xl font-semibold">Start a task</h2><p className="text-sm text-muted-foreground">Go directly to the work you need to do.</p></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {dashboardActions.map((action) => (
            <Link key={action.href} href={action.href} className="group rounded-xl border bg-card p-5 shadow-sm transition-colors hover:border-violet-300 hover:bg-violet-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:hover:border-violet-800 dark:hover:bg-violet-950/30">
              <span className="flex size-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300"><action.icon className="size-5" /></span>
              <h3 className="mt-5 font-semibold">{action.title}</h3><p className="mt-1 min-h-10 text-sm text-muted-foreground">{action.description}</p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-violet-700 dark:text-violet-300">Open <ArrowRight className="size-4" /></span>
            </Link>
          ))}
        </div>
      </section>

      <p className="flex items-center gap-2 text-xs text-muted-foreground"><Clock3 className="size-3.5" /> Dashboard data refreshes when you open this page.</p>
    </div>
  )
}
