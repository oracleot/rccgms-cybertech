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

    if (!profile || !["lead_developer", "developer"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const adminClient = createAdminClient()
    const dbStart = Date.now()
    const [{ error: dbError }, { data: failedNotifs }] = await Promise.all([
      adminClient.from("profiles").select("id").limit(1),
      adminClient
        .from("notifications")
        .select("id, type, status, created_at")
        .eq("status", "failed")
        .order("created_at", { ascending: false })
        .limit(5),
    ])
    const dbLatency = Date.now() - dbStart

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
