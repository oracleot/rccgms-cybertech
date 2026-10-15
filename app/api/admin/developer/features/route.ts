import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"

/**
 * GET /api/admin/developer/features
 *
 * Lists all features. Optionally includes entitlement status for a parish
 * when ?parish_id= is provided.
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

  const { data: features, error } = await admin
    .from("features")
    .select("*")
    .order("category")
    .order("name")

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!parishId) {
    return NextResponse.json({ features })
  }

  const { data: entitlements } = await admin
    .from("parish_feature_entitlements")
    .select("*")
    .eq("parish_id", parishId)

  const entitlementMap = new Map(
    (entitlements ?? []).map((e: Record<string, unknown>) => [e.feature_id, e]),
  )

  const featuresWithEntitlements = (features ?? []).map((f: Record<string, unknown>) => ({
    ...f,
    entitlement: entitlementMap.get(f.id) ?? null,
  }))

  return NextResponse.json({ features: featuresWithEntitlements })
}

/**
 * POST /api/admin/developer/features/grant
 *
 * Grant or revoke a feature for a parish.
 * Body: { parish_id, feature_id, enabled }
 *
 * Developer-only.
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

  if (!profile || !["lead_developer", "developer"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json() as {
    parish_id?: string
    feature_id?: string
    enabled?: boolean
  }

  if (!body.parish_id || !body.feature_id) {
    return NextResponse.json(
      { error: "parish_id and feature_id are required" },
      { status: 400 },
    )
  }

  const admin = createAdminClient()
  const enabled = body.enabled !== false

  const { data, error } = await admin
    .from("parish_feature_entitlements")
    .upsert(
      {
        parish_id: body.parish_id,
        feature_id: body.feature_id,
        enabled,
        granted_by: profile.id,
        granted_at: new Date().toISOString(),
      },
      { onConflict: "parish_id,feature_id" },
    )
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ entitlement: data })
}
