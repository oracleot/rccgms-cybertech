import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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

  // Parse query params
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "50")
  const action = searchParams.get("action")
  const targetType = searchParams.get("targetType")
  const actorId = searchParams.get("actorId")
  const simulated = searchParams.get("simulated")
  const offset = (page - 1) * limit

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- audit_log table is not in generated types yet
  const adminClient = createAdminClient() as any

  let query = adminClient
    .from("audit_log")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (action) query = query.eq("action", action)
  if (targetType) query = query.eq("target_type", targetType)
  if (actorId) query = query.eq("actor_id", actorId)
  if (simulated === "true") query = query.eq("is_simulated", true)
  if (simulated === "false") query = query.eq("is_simulated", false)

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  })
}
