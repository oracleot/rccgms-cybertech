import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("auth_user_id", user.id)
    .single()
  if (!profile || !["lead_developer", "developer"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const admin = createAdminClient()

  try {
    const { data } = await admin.rpc("run_readonly_query", {
      query_text: `
        SELECT
          subsystem,
          severity,
          count(*) FILTER (WHERE timestamp > now() - interval '1 hour')  AS last_1h,
          count(*) FILTER (WHERE timestamp > now() - interval '24 hours') AS last_24h,
          count(*) FILTER (WHERE timestamp > now() - interval '7 days')   AS last_7d,
          count(*)                                                         AS total
        FROM public.developer_events
        GROUP BY subsystem, severity
        ORDER BY subsystem, severity
      `,
    })

    const { data: totals } = await admin.rpc("run_readonly_query", {
      query_text: `
        SELECT
          count(*) FILTER (WHERE timestamp > now() - interval '1 hour')  AS events_1h,
          count(*) FILTER (WHERE timestamp > now() - interval '24 hours') AS events_24h,
          count(*) FILTER (WHERE severity IN ('warn','error') AND timestamp > now() - interval '24 hours') AS errors_24h,
          max(duration_ms) FILTER (WHERE timestamp > now() - interval '1 hour') AS slowest_1h_ms
        FROM public.developer_events
      `,
    })

    return NextResponse.json({
      bySubsystem: data ?? [],
      totals: totals?.[0] ?? { events_1h: 0, events_24h: 0, errors_24h: 0, slowest_1h_ms: null },
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Query failed" },
      { status: 500 },
    )
  }
}
