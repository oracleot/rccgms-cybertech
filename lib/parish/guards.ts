import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ROUTES } from "@/lib/constants"
import type { ParishRole } from "./types"
import { PARISH_ROLE_HIERARCHY } from "./types"

interface ParishGuardResult {
  profileId: string
  parishId: string
  parishRole: ParishRole
}

/**
 * Server-side guard: verifies the user has an active membership in the given
 * parish with one of the allowed roles. Redirects if not.
 */
export async function requireParishRole(
  parishId: string,
  allowedRoles: ParishRole[],
  redirectTo: string = ROUTES.DASHBOARD,
): Promise<ParishGuardResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect(ROUTES.LOGIN)

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .single()

  if (!profile) redirect(ROUTES.LOGIN)

  const { data: membership } = await supabase
    .from("parish_memberships")
    .select("role")
    .eq("parish_id", parishId)
    .eq("profile_id", profile.id)
    .eq("status", "active")
    .single()

  if (!membership || !allowedRoles.includes(membership.role as ParishRole)) {
    redirect(redirectTo)
  }

  return {
    profileId: profile.id,
    parishId,
    parishRole: membership.role as ParishRole,
  }
}

/**
 * Require parish_admin role in the given parish.
 */
export async function requireParishAdmin(
  parishId: string,
  redirectTo?: string,
): Promise<ParishGuardResult> {
  return requireParishRole(parishId, ["parish_admin"], redirectTo)
}

/**
 * Require active membership in the given parish (any role).
 */
export async function requireParishMembership(
  parishId: string,
  redirectTo?: string,
): Promise<ParishGuardResult> {
  return requireParishRole(
    parishId,
    ["parish_admin", "leader", "operator", "member"],
    redirectTo,
  )
}

/**
 * API route helper: validates parish membership and returns result or error
 * object. Does not redirect — callers return the error as a Response.
 */
export async function validateParishAccess(
  parishId: string,
  allowedRoles: ParishRole[],
): Promise<
  | { authorized: true; profileId: string; parishRole: ParishRole }
  | { authorized: false; status: 401 | 403; error: string; message: string }
> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { authorized: false, status: 401, error: "UNAUTHORIZED", message: "Not authenticated" }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .single()

  if (!profile) {
    return { authorized: false, status: 401, error: "UNAUTHORIZED", message: "Profile not found" }
  }

  const { data: membership } = await supabase
    .from("parish_memberships")
    .select("role")
    .eq("parish_id", parishId)
    .eq("profile_id", profile.id)
    .eq("status", "active")
    .single()

  if (!membership || !allowedRoles.includes(membership.role as ParishRole)) {
    return { authorized: false, status: 403, error: "FORBIDDEN", message: "Not a member of this parish or insufficient role" }
  }

  return { authorized: true, profileId: profile.id, parishRole: membership.role as ParishRole }
}

/**
 * Non-throwing boolean check: does the user have at least the given parish
 * role level in the specified parish?
 */
export async function hasMinimumParishRole(
  parishId: string,
  minRole: ParishRole,
): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .single()
  if (!profile) return false

  const { data: membership } = await supabase
    .from("parish_memberships")
    .select("role")
    .eq("parish_id", parishId)
    .eq("profile_id", profile.id)
    .eq("status", "active")
    .single()

  if (!membership) return false

  const userLevel = PARISH_ROLE_HIERARCHY[membership.role as ParishRole] ?? 0
  const requiredLevel = PARISH_ROLE_HIERARCHY[minRole] ?? 0
  return userLevel >= requiredLevel
}
