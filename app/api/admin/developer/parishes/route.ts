import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"

/**
 * GET /api/admin/developer/parishes
 *
 * Lists all organisations and parishes.
 * With ?parish_id=&include=members, includes members for a specific parish.
 *
 * Developer-only.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single()

  if (!profile || !["lead_developer", "developer"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const admin = createAdminClient()
  const parishId = request.nextUrl.searchParams.get("parish_id")
  const include = request.nextUrl.searchParams.get("include")

  if (parishId && include === "members") {
    const { data: members, error } = await admin
      .from("parish_memberships")
      .select("id, parish_id, profile_id, role, status, profiles:profiles!parish_memberships_profile_id_fkey(name, email)")
      .eq("parish_id", parishId)
      .order("role")

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ members: members ?? [] })
  }

  const { data: organisations, error: orgErr } = await admin
    .from("organisations")
    .select("*")
    .order("name")

  if (orgErr) {
    return NextResponse.json({ error: orgErr.message }, { status: 500 })
  }

  const { data: parishes, error: parishErr } = await admin
    .from("parishes")
    .select("*")
    .order("name")

  if (parishErr) {
    return NextResponse.json({ error: parishErr.message }, { status: 500 })
  }

  return NextResponse.json({
    organisations: organisations ?? [],
    parishes: parishes ?? [],
  })
}
