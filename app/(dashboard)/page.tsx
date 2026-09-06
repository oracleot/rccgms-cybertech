import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { format, nextSunday, startOfDay } from "date-fns"
import {
  UpcomingDuties,
  QuickActions,
  CountdownWidget,
  PendingSwapsWidget,
  TeamOverview,
  NotificationFeed,
} from "@/components/dashboard"
import type { MyScheduleItem } from "@/types/rota"
import type { NotificationItem } from "@/types/notification"
import type { UserRole } from "@/types/auth"

export const dynamic = "force-dynamic"

export default async function DashboardHomePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Get user profile
  const { data: profile } = (await supabase
    .from("profiles")
    .select("id, name, role")
    .eq("auth_user_id", user.id)
    .single()) as {
    data: { id: string; name: string; role: UserRole } | null
  }

  if (!profile) {
    redirect("/login")
  }

  const isLeaderOrAdmin =
    profile.role === "admin" || profile.role === "lead_developer" || profile.role === "developer" || profile.role === "leader"

  const today = startOfDay(new Date())
  const thisSunday = nextSunday(today)

  // Fetch user's upcoming assignments
  const { data: assignments } = (await supabase
    .from("rota_assignments")
    .select(
      `
      id,
      status,
      rotas!inner (id, date, services (name)),
      positions!inner (name, departments (name))
    `
    )
    .eq("user_id", profile.id)
    .gte("rotas.date", format(today, "yyyy-MM-dd"))
    .order("rotas(date)")
    .limit(10)) as {
    data: Array<{
      id: string
      status: string
      rotas: { id: string; date: string; services: { name: string } | null }
      positions: { name: string; departments: { name: string } | null }
    }> | null
  }

  const upcomingDuties: MyScheduleItem[] =
    assignments?.map((a) => ({
      id: a.id,
      date: a.rotas?.date ?? "",
      serviceName: a.rotas?.services?.name ?? "Unknown Service",
      positionName: a.positions?.name ?? "Unknown Position",
      departmentName: a.positions?.departments?.name ?? "Unknown Department",
      status: a.status as MyScheduleItem["status"],
      rotaId: a.rotas?.id ?? "",
    })) ?? []

  // Fetch notifications for the user
  const { data: notifications } = (await supabase
    .from("notifications")
    .select("id, type, title, body, is_read, created_at, data")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(10)) as {
    data: Array<{
      id: string
      type: string
      title: string
      body: string
      is_read: boolean
      created_at: string
      data: Record<string, unknown>
    }> | null
  }

  const notificationItems: NotificationItem[] =
    notifications?.map((n) => ({
      id: n.id,
      type: n.type as NotificationItem["type"],
      title: n.title,
      body: n.body,
      isRead: n.is_read,
      createdAt: n.created_at,
      data: n.data,
    })) ?? []

  // Leader/Admin specific data
  let pendingSwaps: Array<{
    id: string
    requesterName: string
    requesterInitials: string
    targetUserName: string | null
    positionName: string
    serviceName: string
    date: string
    status: "pending" | "accepted"
  }> = []

  let departments: Array<{
    id: string
    name: string
    totalMembers: number
    availableThisSunday: number
    assignedThisSunday: number
  }> = []

  let totalMembers = 0
  let activeMembers = 0
  let upcomingServices = 0

  if (isLeaderOrAdmin) {
    // Fetch pending swap requests
    const { data: swapData } = (await supabase
      .from("swap_requests")
      .select(
        `
        id,
        status,
        requester:profiles!swap_requests_requester_id_fkey (id, name),
        target_user:profiles!swap_requests_target_user_id_fkey (id, name),
        assignment:rota_assignments!inner (
          positions (name),
          rotas!inner (date, services (name))
        )
      `
      )
      .in("status", ["pending", "accepted"])
      .order("created_at", { ascending: false })
      .limit(10)) as {
      data: Array<{
        id: string
        status: string
        requester: { id: string; name: string } | null
        target_user: { id: string; name: string } | null
        assignment: {
          positions: { name: string } | null
          rotas: { date: string; services: { name: string } | null }
        }
      }> | null
    }

    pendingSwaps =
      swapData?.map((s) => ({
        id: s.id,
        requesterName: s.requester?.name ?? "Unknown",
        requesterInitials: (s.requester?.name ?? "UN")
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2),
        targetUserName: s.target_user?.name ?? null,
        positionName: s.assignment?.positions?.name ?? "Unknown",
        serviceName: s.assignment?.rotas?.services?.name ?? "Unknown",
        date: s.assignment?.rotas?.date ?? "",
        status: s.status as "pending" | "accepted",
      })) ?? []

    // Fetch department stats
    const { data: deptData } = (await supabase.from("departments").select(
      `
        id,
        name,
        profiles (id)
      `
    )) as {
      data: Array<{
        id: string
        name: string
        profiles: Array<{ id: string }>
      }> | null
    }

    // Get availability for this Sunday
    const { data: availabilityData } = (await supabase
      .from("availability")
      .select("user_id, is_available")
      .eq("date", format(thisSunday, "yyyy-MM-dd"))
      .eq("is_available", true)) as {
      data: Array<{ user_id: string; is_available: boolean }> | null
    }

    const availableUserIds = new Set(availabilityData?.map((a) => a.user_id) ?? [])

    departments =
      deptData?.map((d) => {
        const members = d.profiles ?? []
        const availableMembers = members.filter((m) =>
          availableUserIds.has(m.id)
        )
        return {
          id: d.id,
          name: d.name,
          totalMembers: members.length,
          availableThisSunday: availableMembers.length,
          assignedThisSunday: 0, // Could calculate from assignments if needed
        }
      }) ?? []

    // Get member counts
    const { count: memberCount } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })

    totalMembers = memberCount ?? 0
    activeMembers = availableUserIds.size

    // Get upcoming services count
    const { count: serviceCount } = await supabase
      .from("rotas")
      .select("id", { count: "exact", head: true })
      .gte("date", format(today, "yyyy-MM-dd"))
      .eq("status", "published")

    upcomingServices = serviceCount ?? 0
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">
          Welcome back, {profile.name?.split(" ")[0] ?? "Member"}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s happening with your tech team
        </p>
      </div>

      {/* Top Row: Countdown + Stats (Leader/Admin only) */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <CountdownWidget />
        {isLeaderOrAdmin && (
          <>
            <div className="lg:col-span-2">
              <TeamOverview
                departments={departments}
                totalMembers={totalMembers}
                activeMembers={activeMembers}
                upcomingServices={upcomingServices}
              />
            </div>
          </>
        )}
        {!isLeaderOrAdmin && (
          <div className="md:col-span-1">
            <QuickActions userRole={profile.role} maxItems={4} />
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          <UpcomingDuties assignments={upcomingDuties} />
          {isLeaderOrAdmin && <QuickActions userRole={profile.role} />}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {isLeaderOrAdmin && (
            <PendingSwapsWidget swaps={pendingSwaps} />
          )}
          <NotificationFeed notifications={notificationItems} />
        </div>
      </div>
    </div>
  )
}
