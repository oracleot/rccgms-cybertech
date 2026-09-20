import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest) {
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

  const params = request.nextUrl.searchParams
  const subsystem = params.get("subsystem")
  const severity = params.get("severity")
  const status = params.get("status")
  const since = params.get("since")
  const search = params.get("search")
  const limit = Math.min(Number(params.get("limit")) || 100, 500)
  const offset = Number(params.get("offset")) || 0

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (admin as any)
    .from("developer_events")
    .select("*", { count: "exact" })
    .order("timestamp", { ascending: false })
    .range(offset, offset + limit - 1)

  if (subsystem) query = query.eq("subsystem", subsystem)
  if (severity) query = query.eq("severity", severity)
  if (status) query = query.eq("status", status)
  if (since) query = query.gte("timestamp", since)
  if (search) query = query.ilike("action", `%${search}%`)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ events: data ?? [], total: count ?? 0, limit, offset })
}
