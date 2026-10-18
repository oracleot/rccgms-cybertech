import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"

/**
 * GET /api/admin/developer/parishes
 *
 * Lists all organisations and parishes.
 * Platform admins may read only the organisation/parish summary. Developers
 * may additionally inspect parish memberships.
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

  if (!profile || !["admin", "lead_developer", "developer"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const isPlatformDeveloper = ["lead_developer", "developer"].includes(profile.role)
  const parishId = request.nextUrl.searchParams.get("parish_id")
  const include = request.nextUrl.searchParams.get("include")

  if (parishId && include === "members") {
    if (!isPlatformDeveloper) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    const admin = createAdminClient()
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

  const admin = createAdminClient()
  if (!isPlatformDeveloper) {
    const [{ data: organisations, error: orgErr }, { data: parishes, error: parishErr }] = await Promise.all([
      admin.from("organisations").select("id, name, short_name, slug, status").order("name"),
      admin.from("parishes").select("id, organisation_id, name, slug, status").order("name"),
    ])
    if (orgErr) return NextResponse.json({ error: orgErr.message }, { status: 500 })
    if (parishErr) return NextResponse.json({ error: parishErr.message }, { status: 500 })
    return NextResponse.json({ organisations: organisations ?? [], parishes: parishes ?? [] })
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

/**
 * POST /api/admin/developer/parishes
 * Create an active organisation or parish from Developer Tools.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single()

  if (!profile || !["lead_developer", "developer"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const type = body?.type
  const name = typeof body?.name === "string" ? body.name.trim() : ""
  const slug = typeof body?.slug === "string" ? body.slug.trim().toLowerCase() : ""
  if (!["organisation", "parish"].includes(type) || !name || !slug) {
    return NextResponse.json({ error: "Type, name, and slug are required" }, { status: 400 })
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return NextResponse.json({ error: "Slug must use lowercase letters, numbers, and hyphens" }, { status: 400 })
  }

  const admin = createAdminClient()
  if (type === "organisation") {
    const { data, error } = await admin
      .from("organisations")
      .insert({
        name,
        short_name: typeof body.short_name === "string" ? body.short_name.trim() || null : null,
        slug,
        status: "active",
        created_by: profile.id,
      })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ organisation: data }, { status: 201 })
  }

  const organisationId = typeof body?.organisation_id === "string" ? body.organisation_id : ""
  const country = typeof body?.country === "string" ? body.country.trim() : ""
  if (!organisationId || !country) {
    return NextResponse.json({ error: "Organisation and country are required for a parish" }, { status: 400 })
  }

  const { data, error } = await admin
    .from("parishes")
    .insert({
      organisation_id: organisationId,
      name,
      spiritual_expression: typeof body.spiritual_expression === "string" ? body.spiritual_expression.trim() || null : null,
      locality: typeof body.locality === "string" ? body.locality.trim() || null : null,
      region: typeof body.region === "string" ? body.region.trim() || null : null,
      country,
      slug,
      status: "active",
      created_by: profile.id,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ parish: data }, { status: 201 })
}
