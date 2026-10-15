import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

const MAX_LEN = 200
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

/**
 * POST /api/parishes/request
 *
 * An authenticated user asks for a new parish to be created inside an
 * existing, active organisation. A platform developer reviews it via
 * /api/admin/developer/requests; on approval the requester becomes the
 * parish's first parish_admin. The requester cannot activate the parish.
 *
 * Body: { organisation_id, name, city, country }
 * Maps to parish_requests: parish_name = name, locality = city.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const organisationId = clean(body.organisation_id)
  const name = clean(body.name)
  const city = clean(body.city)
  const country = clean(body.country)

  if (!organisationId || !name || !city || !country) {
    return NextResponse.json(
      { error: "organisation_id, name, city and country are all required" },
      { status: 400 },
    )
  }
  if (!UUID_RE.test(organisationId)) {
    return NextResponse.json({ error: "Invalid organisation_id" }, { status: 400 })
  }
  if ([name, city, country].some((v) => v.length > MAX_LEN)) {
    return NextResponse.json(
      { error: `Fields must be ${MAX_LEN} characters or fewer` },
      { status: 400 },
    )
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 401 })
  }

  // Organisation must exist and be active (RLS only exposes active orgs to non-developers)
  const { data: org } = await supabase
    .from("organisations")
    .select("id, name, status")
    .eq("id", organisationId)
    .eq("status", "active")
    .maybeSingle()

  if (!org) {
    return NextResponse.json({ error: "Organisation not found" }, { status: 404 })
  }

  // Block duplicate pending requests from the same user for the same parish
  const { data: existing } = await supabase
    .from("parish_requests")
    .select("id")
    .eq("requested_by", profile.id)
    .eq("organisation_id", organisationId)
    .eq("status", "pending")
    .ilike("parish_name", name.replace(/[%_\\]/g, "\\$&"))
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json(
      { error: "You already have a pending request for this parish" },
      { status: 409 },
    )
  }

  const { data: created, error } = await supabase
    .from("parish_requests")
    .insert({
      organisation_id: org.id,
      organisation_name: org.name,
      parish_name: name,
      locality: city,
      country,
      requested_by: profile.id,
      status: "pending",
    })
    .select("*")
    .single()

  if (error || !created) {
    return NextResponse.json(
      { error: "Failed to submit parish request" },
      { status: 500 },
    )
  }

  return NextResponse.json({ request: created }, { status: 201 })
}
