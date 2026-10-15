import { createClient } from "@/lib/supabase/server"
import { getFusionContext } from "@/lib/parish/context"
import type { FeatureSlug } from "./types"

type UntypedSupabase = { from: (t: string) => ReturnType<ReturnType<typeof createClient> extends Promise<infer S> ? S extends { from: infer F } ? F : never : never> }

/**
 * Checks whether a parish has access to a given feature.
 *
 * Entitlement rows are authoritative once a parish is provisioned.
 * is_default only determines what a NEW parish initially receives.
 * An explicit enabled=false OVERRIDES defaults.
 *
 * Logic:
 * 1. Look up the feature by slug
 * 2. Look up the parish's entitlement row for that feature
 * 3. If an entitlement row exists: use its enabled flag (+ check expiry)
 * 4. If NO entitlement row exists: fall back to is_default
 *    (covers the brief window before bootstrap creates entitlement rows)
 */
export async function hasFeature(
  parishId: string,
  featureSlug: FeatureSlug,
): Promise<boolean> {
  const supabase = await createClient()

  const { data: feature } = await (supabase as unknown as UntypedSupabase)
    .from("features")
    .select("id, is_default")
    .eq("slug", featureSlug)
    .single()

  if (!feature) return false

  const { data: entitlement } = await (supabase as unknown as UntypedSupabase)
    .from("parish_feature_entitlements")
    .select("id, enabled, expires_at")
    .eq("parish_id", parishId)
    .eq("feature_id", feature.id)
    .single()

  if (!entitlement) return false

  if (!entitlement.enabled) return false
  if (entitlement.expires_at && new Date(entitlement.expires_at) < new Date()) {
    return false
  }
  return true
}

/**
 * Server-side guard: redirects if the parish does not have the feature.
 */
export async function requireFeature(
  parishId: string,
  featureSlug: FeatureSlug,
  redirectTo: string = "/dashboard",
): Promise<void> {
  const allowed = await hasFeature(parishId, featureSlug)
  if (!allowed) {
    const { redirect } = await import("next/navigation")
    redirect(redirectTo)
  }
}

/**
 * API route helper: returns an error object if the feature is not available,
 * or null if the feature is accessible.
 */
export async function validateFeatureAccess(
  parishId: string,
  featureSlug: FeatureSlug,
): Promise<{ status: 403; error: string; message: string } | null> {
  const allowed = await hasFeature(parishId, featureSlug)
  if (!allowed) {
    return {
      status: 403,
      error: "FEATURE_NOT_AVAILABLE",
      message: `Feature "${featureSlug}" is not available for this parish`,
    }
  }
  return null
}

/**
 * Page-level guard: redirects to /dashboard if the active parish does not have
 * the feature. Platform developers bypass the check (same logic as the sidebar).
 * Call at the top of a route-group layout.tsx.
 */
export async function requireFeatureForPage(
  featureSlug: FeatureSlug,
): Promise<void> {
  const ctx = await getFusionContext()
  if (!ctx) {
    const { redirect } = await import("next/navigation")
    redirect("/login")
    return
  }

  const role = ctx.profile.role ?? "member"
  if (role === "lead_developer" || role === "developer") return

  const parishId = ctx.activeParish?.parish.id
  if (!parishId) return

  const allowed = await hasFeature(parishId, featureSlug)
  if (!allowed) {
    const { redirect } = await import("next/navigation")
    redirect("/dashboard")
  }
}

/**
 * Returns all features with their entitlement status for a given parish.
 * Entitlement rows are authoritative when present.
 */
export async function getParishFeatures(
  parishId: string,
): Promise<Array<{
  slug: string
  name: string
  category: string
  is_default: boolean
  enabled: boolean
}>> {
  const supabase = await createClient()

  const { data: features } = await (supabase as unknown as UntypedSupabase)
    .from("features")
    .select("id, slug, name, category, is_default")
    .order("category")
    .order("name")

  if (!features) return []

  const { data: entitlements } = await (supabase as unknown as UntypedSupabase)
    .from("parish_feature_entitlements")
    .select("feature_id, enabled, expires_at")
    .eq("parish_id", parishId)

  const entitlementMap = new Map(
    (entitlements ?? []).map((e: { feature_id: string; enabled: boolean; expires_at: string | null }) => [
      e.feature_id,
      e,
    ]),
  )

  return features.map((f: { id: string; slug: string; name: string; category: string; is_default: boolean }) => {
    const ent = entitlementMap.get(f.id) as { enabled: boolean; expires_at: string | null } | undefined

    if (!ent) {
      return { slug: f.slug, name: f.name, category: f.category, is_default: f.is_default, enabled: false }
    }

    const active =
      ent.enabled === true &&
      (!ent.expires_at || new Date(ent.expires_at) >= new Date())
    return { slug: f.slug, name: f.name, category: f.category, is_default: f.is_default, enabled: active }
  })
}
