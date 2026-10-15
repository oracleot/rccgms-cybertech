import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

const MAX_LEN = 200

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

/**
 * POST /api/organisations/request
 *
 * An authenticated user asks for a new organisation (denomination / network)
 * to be added to the platform. A platform developer reviews it via
 * /api/admin/developer/requests.
 *
 * Body: { name, denomination, country, city }
 *
 * NOTE: organisation_requests (migration 050) only stores `name` and
 * `short_name`. `denomination` is persisted as `short_name`; `country` and
 * `city` are validated but not stored because the table has no columns for
 * them (the parish request carries location).
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

  const name = clean(body.name)
  const denomination = clean(body.denomination)
  const country = clean(body.country)
  const city = clean(body.city)

  if (!name || !denomination || !country || !city) {
    return NextResponse.json(
      { error: "name, denomination, country and city are all required" },
      { status: 400 },
    )
  }
  if ([name, denomination, country, city].some((v) => v.length > MAX_LEN)) {
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

  // Block duplicate pending requests from the same user for the same name
  const { data: existing } = await supabase
    .from("organisation_requests")
    .select("id")
    .eq("requested_by", profile.id)
    .eq("status", "pending")
    .ilike("name", name.replace(/[%_\\]/g, "\\$&"))
    .limit(1)

  if (existing && existing.length > 0) {
    return NextResponse.json(
      { error: "You already have a pending request for this organisation" },
      { status: 409 },
    )
  }

  const { data: created, error } = await supabase
    .from("organisation_requests")
    .insert({
      name,
      short_name: denomination,
      requested_by: profile.id,
      status: "pending",
    })
    .select("*")
    .single()

  if (error || !created) {
    return NextResponse.json(
      { error: "Failed to submit organisation request" },
      { status: 500 },
    )
  }

  return NextResponse.json({ request: created }, { status: 201 })
}
