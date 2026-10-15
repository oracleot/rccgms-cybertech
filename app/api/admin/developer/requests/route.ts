import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  requireActiveParishMember,
  isParishAuthFailure,
} from "@/lib/parish/require-active-parish"

export const runtime = "nodejs"

type Admin = ReturnType<typeof createAdminClient>

function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
  return base || "item"
}

/** Returns a slug not yet used in `table` (optionally scoped to an organisation). */
async function uniqueSlug(
  admin: Admin,
  table: "organisations" | "parishes",
  base: string,
  organisationId?: string,
): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`
    let q = admin.from(table).select("id").eq("slug", candidate).limit(1)
    if (organisationId) q = q.eq("organisation_id", organisationId)
    const { data } = await q
    if (!data || data.length === 0) return candidate
  }
  return `${base}-${Date.now().toString(36)}`
}

async function requireDeveloper() {
  const auth = await requireActiveParishMember()
  if (isParishAuthFailure(auth)) {
    return { response: NextResponse.json({ error: auth.error }, { status: auth.status }) }
  }
  if (!auth.isPlatformDeveloper) {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { auth }
}

/**
 * GET /api/admin/developer/requests
 * Lists pending organisation and parish requests (oldest first) with requester info.
 */
export async function GET() {
  const gate = await requireDeveloper()
  if (gate.response) return gate.response

  const admin = createAdminClient()

  const [orgRes, parishRes] = await Promise.all([
    admin
      .from("organisation_requests")
      .select("*, requester:profiles!requested_by(id, name, email)")
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    admin
      .from("parish_requests")
      .select(
        "*, requester:profiles!requested_by(id, name, email), organisation:organisations(id, name, status)",
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
  ])

  if (orgRes.error || parishRes.error) {
    return NextResponse.json(
      { error: orgRes.error?.message ?? parishRes.error?.message ?? "Query failed" },
      { status: 500 },
    )
  }

  return NextResponse.json({
    organisation_requests: orgRes.data ?? [],
    parish_requests: parishRes.data ?? [],
  })
}

/**
 * PATCH /api/admin/developer/requests
 * Body: { type: 'organisation'|'parish', id, action: 'approve'|'decline', notes? }
 *
 * - Decline requires notes.
 * - Approving an organisation request creates an active organisation.
 * - Approving a parish request creates the parish under the requested
 *   organisation and makes the requester its first active parish_admin.
 */
export async function PATCH(request: Request) {
  const gate = await requireDeveloper()
  if (gate.response) return gate.response
  const reviewerId = gate.auth!.profileId

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const type = body.type
  const id = typeof body.id === "string" ? body.id : ""
  const action = body.action
  const notes = typeof body.notes === "string" ? body.notes.trim() : ""

  if (type !== "organisation" && type !== "parish") {
    return NextResponse.json({ error: "type must be 'organisation' or 'parish'" }, { status: 400 })
  }
  if (action !== "approve" && action !== "decline") {
    return NextResponse.json({ error: "action must be 'approve' or 'decline'" }, { status: 400 })
  }
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 })
  }
  if (action === "decline" && !notes) {
    return NextResponse.json({ error: "A note is required when declining" }, { status: 400 })
  }

  const admin = createAdminClient()
  const table = type === "organisation" ? "organisation_requests" : "parish_requests"
  const now = new Date().toISOString()

  const { data: req, error: loadErr } = await admin
    .from(table)
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (loadErr) {
    return NextResponse.json({ error: loadErr.message }, { status: 500 })
  }
  if (!req) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 })
  }
  if (req.status !== "pending") {
    return NextResponse.json({ error: `Request already ${req.status}` }, { status: 409 })
  }

  // ---- Decline ----
  if (action === "decline") {
    const { data: updated, error } = await admin
      .from(table)
      .update({ status: "declined", reviewed_by: reviewerId, reviewed_at: now, reviewer_note: notes })
      .eq("id", id)
      .eq("status", "pending")
      .select("*")
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!updated) return NextResponse.json({ error: "Request is no longer pending" }, { status: 409 })
    return NextResponse.json({ request: updated })
  }

  // ---- Approve: claim the request first so concurrent reviews cannot double-create ----
  const { data: claimed, error: claimErr } = await admin
    .from(table)
    .update({
      status: "approved",
      reviewed_by: reviewerId,
      reviewed_at: now,
      reviewer_note: notes || null,
    })
    .eq("id", id)
    .eq("status", "pending")
    .select("*")
    .maybeSingle()

  if (claimErr) return NextResponse.json({ error: claimErr.message }, { status: 500 })
  if (!claimed) return NextResponse.json({ error: "Request is no longer pending" }, { status: 409 })

  const revert = () =>
    admin
      .from(table)
      .update({ status: "pending", reviewed_by: null, reviewed_at: null, reviewer_note: null })
      .eq("id", id)

  if (type === "organisation") {
    const slug = await uniqueSlug(admin, "organisations", slugify(req.name))
    const { data: org, error: orgErr } = await admin
      .from("organisations")
      .insert({
        name: req.name,
        short_name: req.short_name ?? null,
        slug,
        status: "active",
        created_by: reviewerId,
      })
      .select("*")
      .single()

    if (orgErr || !org) {
      await revert()
      return NextResponse.json(
        { error: "Failed to create organisation", detail: orgErr?.message },
        { status: 500 },
      )
    }

    const { data: linked } = await admin
      .from("organisation_requests")
      .update({ linked_org_id: org.id })
      .eq("id", id)
      .select("*")
      .single()

    return NextResponse.json({ request: linked ?? claimed, organisation: org })
  }

  // type === 'parish'
  if (!req.organisation_id) {
    await revert()
    return NextResponse.json(
      { error: "This parish request has no linked organisation. Approve the organisation request first." },
      { status: 400 },
    )
  }

  const { data: org } = await admin
    .from("organisations")
    .select("id, status")
    .eq("id", req.organisation_id)
    .maybeSingle()

  if (!org || org.status !== "active") {
    await revert()
    return NextResponse.json({ error: "Linked organisation is not active" }, { status: 400 })
  }

  const slug = await uniqueSlug(admin, "parishes", slugify(`${req.parish_name}-${req.locality ?? ""}`), org.id)
  const { data: parish, error: parishErr } = await admin
    .from("parishes")
    .insert({
      organisation_id: org.id,
      name: req.parish_name,
      spiritual_expression: req.spiritual_expression ?? null,
      locality: req.locality ?? null,
      region: req.region ?? null,
      country: req.country,
      slug,
      status: "active",
      created_by: reviewerId,
    })
    .select("*")
    .single()

  if (parishErr || !parish) {
    await revert()
    return NextResponse.json(
      { error: "Failed to create parish", detail: parishErr?.message },
      { status: 500 },
    )
  }

  // Requester becomes the first parish_admin (active immediately; they do not activate the parish themselves)
  const { error: memberErr } = await admin.from("parish_memberships").insert({
    parish_id: parish.id,
    profile_id: req.requested_by,
    role: "parish_admin",
    status: "active",
    requested_at: req.created_at ?? now,
    approved_at: now,
    approved_by: reviewerId,
  })

  if (memberErr) {
    // Roll back so the request can be retried cleanly
    await admin.from("parishes").delete().eq("id", parish.id)
    await revert()
    return NextResponse.json(
      { error: "Failed to create parish admin membership", detail: memberErr.message },
      { status: 500 },
    )
  }

  const { data: linked } = await admin
    .from("parish_requests")
    .update({ linked_parish_id: parish.id })
    .eq("id", id)
    .select("*")
    .single()

  return NextResponse.json({ request: linked ?? claimed, parish })
}
