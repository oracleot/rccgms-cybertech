import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getActiveParishId } from "@/lib/parish/context"

export const runtime = "nodejs"

/**
 * GET /api/admin/parish
 *
 * Returns the current user's active parish with members, pending requests,
 * and feature entitlements. Used by the parish admin dashboard.
 *
 * Requires parish_admin role in the parish, OR platform developer role.
 */
export async function GET() {
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

  const admin = createAdminClient()

  const parishId = await getActiveParishId()

  if (!parishId) {
    return NextResponse.json({ parish: null, members: [], pendingMembers: [], features: [] })
  }

  // Check role in the active parish
  const { data: membership } = await admin
    .from("parish_memberships")
    .select("role")
    .eq("profile_id", profile.id)
    .eq("parish_id", parishId)
    .eq("status", "active")
    .single()

  // Enforce: parish_admin in this parish, OR platform developer
  const isPlatformDeveloper = ["lead_developer", "developer"].includes(profile.role)
  if (membership?.role !== "parish_admin" && !isPlatformDeveloper) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const [parishRes, membersRes, pendingRes, featuresRes, entitlementsRes] = await Promise.all([
    admin
      .from("parishes")
      .select("*, organisations(name, short_name)")
      .eq("id", parishId)
      .single(),
    admin
      .from("parish_memberships")
      .select("id, parish_id, profile_id, role, status, requested_at, approved_at, profiles:profiles!parish_memberships_profile_id_fkey(name, email)")
      .eq("parish_id", parishId)
      .eq("status", "active")
      .order("role"),
    admin
      .from("parish_memberships")
      .select("id, parish_id, profile_id, role, status, requested_at, profiles:profiles!parish_memberships_profile_id_fkey(name, email)")
      .eq("parish_id", parishId)
      .eq("status", "pending")
      .order("requested_at"),
    admin
      .from("features")
      .select("id, slug, name, category, is_default")
      .order("category")
      .order("name"),
    admin
      .from("parish_feature_entitlements")
      .select("feature_id, enabled, expires_at")
      .eq("parish_id", parishId),
  ])

  const queryError = [parishRes, membersRes, pendingRes, featuresRes, entitlementsRes].find(result => result.error)?.error
  if (queryError) return NextResponse.json({ error: queryError.message }, { status: 500 })

  const parish = parishRes.data
    ? {
        ...parishRes.data,
        organisation: (parishRes.data as Record<string, unknown>).organisations ?? null,
      }
    : null

  const entitlementMap = new Map(
    (entitlementsRes.data ?? []).map((e: Record<string, unknown>) => [e.feature_id, e]),
  )

  const features = (featuresRes.data ?? []).map((f: Record<string, unknown>) => {
    const ent = entitlementMap.get(f.id) as { enabled: boolean; expires_at: string | null } | undefined

    if (!ent) {
      return { slug: f.slug, name: f.name, category: f.category, is_default: !!f.is_default, enabled: false }
    }

    const active =
      ent.enabled === true &&
      (!ent.expires_at || new Date(ent.expires_at) >= new Date())
    return { slug: f.slug, name: f.name, category: f.category, is_default: !!f.is_default, enabled: active }
  })

  return NextResponse.json({
    parish,
    members: membersRes.data ?? [],
    pendingMembers: pendingRes.data ?? [],
    features,
  })
}
