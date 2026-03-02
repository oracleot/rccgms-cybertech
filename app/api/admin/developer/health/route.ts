import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

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
    const { data: dbCheck, error: dbError } = await adminClient
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

    const totalLatency = Date.now() - startTime

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
