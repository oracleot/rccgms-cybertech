import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { emitEvent } from "@/lib/telemetry"

export async function GET() {
  const startTime = Date.now()

  try {
    const supabase = await createClient()

    // Check auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
    }

    // Check role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("auth_user_id", user.id)
      .single()

    if (!profile || !["admin", "lead_developer", "developer"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Database health check
    const dbStart = Date.now()
    const adminClient = createAdminClient()
    const { error: dbError } = await adminClient
      .from("profiles")
      .select("id")
      .limit(1)
    const dbLatency = Date.now() - dbStart

    // Get table counts
    const [
      { count: profileCount },
      { count: departmentCount },
      { count: equipmentCount },
      { count: rotaCount },
      { count: rundownCount },
      { count: designCount },
      { count: notificationCount },
    ] = await Promise.all([
      adminClient.from("profiles").select("*", { count: "exact", head: true }),
      adminClient.from("departments").select("*", { count: "exact", head: true }),
      adminClient.from("equipment").select("*", { count: "exact", head: true }),
      adminClient.from("rotas").select("*", { count: "exact", head: true }),
      adminClient.from("rundowns").select("*", { count: "exact", head: true }),
      adminClient.from("design_requests").select("*", { count: "exact", head: true }),
      adminClient.from("notifications").select("*", { count: "exact", head: true }),
    ])

    // Get recent failed notifications
    const { data: failedNotifs } = await adminClient
      .from("notifications")
      .select("id, type, status, created_at")
      .eq("status", "failed")
      .order("created_at", { ascending: false })
      .limit(5)

    // Broadcast rooms count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count: broadcastRoomCount } = await (adminClient as any)
      .from("broadcast_controllers")
      .select("*", { count: "exact", head: true })

    // Lyric sets count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count: lyricSetCount } = await (adminClient as any)
      .from("worship_library")
      .select("*", { count: "exact", head: true })

    // Event summary (last 24h)
    let eventSummary = null
    try {
      const since24h = new Date(Date.now() - 86_400_000).toISOString()
      const since1h = new Date(Date.now() - 3_600_000).toISOString()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const devEvents = (adminClient as any).from("developer_events")
      const [ev24, ev1h, err24, slowest] = await Promise.all([
        devEvents.select("*", { count: "exact", head: true }).gte("timestamp", since24h),
        devEvents.select("*", { count: "exact", head: true }).gte("timestamp", since1h),
        devEvents.select("*", { count: "exact", head: true }).gte("timestamp", since24h).in("severity", ["error"]),
        devEvents.select("duration_ms").gte("timestamp", since1h).order("duration_ms", { ascending: false }).limit(1),
      ])
      eventSummary = {
        events_24h: ev24.count ?? 0,
        events_1h: ev1h.count ?? 0,
        errors_24h: err24.count ?? 0,
        slowest_1h_ms: slowest.data?.[0]?.duration_ms ?? null,
      }
    } catch { /* events table may not exist yet */ }

    const totalLatency = Date.now() - startTime

    void emitEvent({ subsystem: "system", action: "health_check", status: "ok", severity: "debug", duration_ms: totalLatency })

    return NextResponse.json({
      status: dbError ? "degraded" : "healthy",
      timestamp: new Date().toISOString(),
      latency: {
        total: totalLatency,
        database: dbLatency,
      },
      database: {
        connected: !dbError,
        error: dbError?.message || null,
      },
      tables: {
        profiles: profileCount ?? 0,
        departments: departmentCount ?? 0,
        equipment: equipmentCount ?? 0,
        rotas: rotaCount ?? 0,
        rundowns: rundownCount ?? 0,
        design_requests: designCount ?? 0,
        notifications: notificationCount ?? 0,
      },
      broadcastRooms: broadcastRoomCount ?? 0,
      lyricSets: lyricSetCount ?? 0,
      eventSummary,
      gitSha: process.env.VERCEL_GIT_COMMIT_SHA || null,
      recentFailedNotifications: failedNotifs ?? [],
      environment: {
        nodeEnv: process.env.NODE_ENV,
        nextRuntime: process.env.NEXT_RUNTIME || "nodejs",
        vercelEnv: process.env.VERCEL_ENV || "local",
        region: process.env.VERCEL_REGION || "local",
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
        latency: { total: Date.now() - startTime },
      },
      { status: 500 }
    )
  }
}
