import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getActiveParishId } from "@/lib/parish/context"

export const runtime = "nodejs"

/**
 * GET /api/admin/developer/features/requests
 *
 * Lists feature access requests. Developers see all; parish admins see their parish's.
 * Query params: ?status=pending (default), ?parish_id=
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

  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const isPlatformDeveloper = ["lead_developer", "developer"].includes(profile.role)

  const admin = createAdminClient()

  // Parish admins: resolve their active parish to scope the query
  let callerParishId: string | null = null
  if (!isPlatformDeveloper) {
    callerParishId = await getActiveParishId()
    if (!callerParishId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Verify the caller is a parish_admin in their active parish
    const { data: membership } = await admin
      .from("parish_memberships")
      .select("role")
      .eq("profile_id", profile.id)
      .eq("parish_id", callerParishId)
      .eq("status", "active")
      .single()

    if (!membership || membership.role !== "parish_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  const status = request.nextUrl.searchParams.get("status") ?? "pending"
  const parishId = request.nextUrl.searchParams.get("parish_id")

  let query = admin
    .from("feature_access_requests")
    .select("*, features(slug, name), parishes(name)")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(50)

  if (isPlatformDeveloper && parishId) {
    query = query.eq("parish_id", parishId)
  } else if (!isPlatformDeveloper && callerParishId) {
    query = query.eq("parish_id", callerParishId)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ requests: data ?? [] })
}

/**
 * POST /api/admin/developer/features/requests
 *
 * Create a feature access request (parish admin) or review one (developer).
 *
 * Create: { action: "create", parish_id, feature_id, notes? }
 * Review: { action: "review", request_id, status: "approved"|"declined", notes? }
 */
export async function POST(request: NextRequest) {
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

  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json() as {
    action: "create" | "review"
    parish_id?: string
    feature_id?: string
    request_id?: string
    status?: "approved" | "declined"
    notes?: string
  }

  const admin = createAdminClient()

  if (body.action === "create") {
    if (!body.parish_id || !body.feature_id) {
      return NextResponse.json(
        { error: "parish_id and feature_id are required" },
        { status: 400 },
      )
    }

    // Only parish admins (or platform developers) can create feature requests
    const isDeveloper = ["lead_developer", "developer"].includes(profile.role)
    if (!isDeveloper) {
      const { data: membership } = await admin
        .from("parish_memberships")
        .select("role")
        .eq("parish_id", body.parish_id)
        .eq("profile_id", profile.id)
        .eq("status", "active")
        .single()

      if (!membership || membership.role !== "parish_admin") {
        return NextResponse.json(
          { error: "Only parish admins can request features" },
          { status: 403 },
        )
      }
    }

    const { data: existing } = await admin
      .from("feature_access_requests")
      .select("id")
      .eq("parish_id", body.parish_id)
      .eq("feature_id", body.feature_id)
      .eq("status", "pending")
      .single()

    if (existing) {
      return NextResponse.json(
        { error: "A pending request already exists for this feature" },
        { status: 409 },
      )
    }

    const { data, error } = await admin
      .from("feature_access_requests")
      .insert({
        parish_id: body.parish_id,
        feature_id: body.feature_id,
        requested_by: profile.id,
        notes: body.notes ?? null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ request: data }, { status: 201 })
  }

  if (body.action === "review") {
    if (!["lead_developer", "developer"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (!body.request_id || !body.status) {
      return NextResponse.json(
        { error: "request_id and status are required" },
        { status: 400 },
      )
    }

    const { data: req, error: fetchErr } = await admin
      .from("feature_access_requests")
      .select("*")
      .eq("id", body.request_id)
      .eq("status", "pending")
      .single()

    if (fetchErr || !req) {
      return NextResponse.json(
        { error: "Request not found or already reviewed" },
        { status: 404 },
      )
    }

    const { error: updateErr } = await admin
      .from("feature_access_requests")
      .update({
        status: body.status,
        reviewer_id: profile.id,
        reviewed_at: new Date().toISOString(),
        notes: body.notes ?? req.notes,
      })
      .eq("id", body.request_id)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    if (body.status === "approved") {
      await admin
        .from("parish_feature_entitlements")
        .upsert(
          {
            parish_id: req.parish_id,
            feature_id: req.feature_id,
            enabled: true,
            granted_by: profile.id,
            granted_at: new Date().toISOString(),
          },
          { onConflict: "parish_id,feature_id" },
        )
    }

    return NextResponse.json({
      message: `Request ${body.status}`,
      entitlementGranted: body.status === "approved",
    })
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}
