import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ROUTES, USER_ROLES } from "@/lib/constants"
import type { UserRole } from "@/lib/constants"

interface ProfileData {
  id: string
  name: string
  role: string
}

/**
 * Server-side role guard - use in Server Components and API routes
 * Throws redirect if user doesn't have required role
 */
export async function requireRole(
  allowedRoles: UserRole[],
  redirectTo: string = ROUTES.DASHBOARD
): Promise<{
  user: { id: string; email: string }
  profile: { id: string; name: string; role: UserRole }
}> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(ROUTES.LOGIN)
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("id, name, role")
    .eq("auth_user_id", user.id)
    .single()

  const profile = profileData as ProfileData | null

  if (!profile) {
    redirect(ROUTES.LOGIN)
  }

  const userRole = profile.role as UserRole

  if (!allowedRoles.includes(userRole)) {
    redirect(redirectTo)
  }

  return {
    user: { id: user.id, email: user.email! },
    profile: { id: profile.id, name: profile.name, role: userRole },
  }
}

/**
 * Require admin role
 */
/**
 * Require admin role
 */
export async function requireAdmin() {
  return requireRole([USER_ROLES.ADMIN])
}

/**
 * Require admin or lead developer role
 */
export async function requireAdminOrDeveloper() {
  return requireRole([USER_ROLES.ADMIN, USER_ROLES.LEAD_DEVELOPER, USER_ROLES.DEVELOPER])
}

/**
 * Require lead developer or admin role (for managing developers)
 */
export async function requireLeadDeveloper() {
  return requireRole([USER_ROLES.ADMIN, USER_ROLES.LEAD_DEVELOPER])
}

/**
 * Require leader, developer, or admin role
 */
export async function requireLeader() {
  return requireRole([USER_ROLES.ADMIN, USER_ROLES.LEAD_DEVELOPER, USER_ROLES.DEVELOPER, USER_ROLES.LEADER])
}

/**
 * Require any authenticated user
 */
export async function requireAuth() {
  return requireRole([USER_ROLES.ADMIN, USER_ROLES.LEAD_DEVELOPER, USER_ROLES.DEVELOPER, USER_ROLES.LEADER, USER_ROLES.MEMBER])
}

/**
 * Check if user has a specific role (without throwing)
 * Returns null if not authenticated or no profile
 */
export async function checkRole(role: UserRole): Promise<boolean> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return false

  const { data: profileData } = await supabase
    .from("profiles")
    .select("role")
    .eq("auth_user_id", user.id)
    .single()

  const profile = profileData as { role: string } | null

  if (!profile) return false

  return profile.role === role
}

/**
 * Check if user has at least the specified role level
 * Role hierarchy: admin > developer > leader > member
 */
export async function hasMinimumRole(minRole: UserRole): Promise<boolean> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return false

  const { data: profileData } = await supabase
    .from("profiles")
    .select("role")
    .eq("auth_user_id", user.id)
    .single()

  const profile = profileData as { role: string } | null

  if (!profile) return false

  const roleHierarchy: Record<UserRole, number> = {
    [USER_ROLES.ADMIN]: 5,
    [USER_ROLES.LEAD_DEVELOPER]: 4,
    [USER_ROLES.DEVELOPER]: 3,
    [USER_ROLES.LEADER]: 2,
    [USER_ROLES.MEMBER]: 1,
  }

  const userLevel = roleHierarchy[profile.role as UserRole] || 0
  const requiredLevel = roleHierarchy[minRole] || 0

  return userLevel >= requiredLevel
}

/**
 * API route helper - validates role and returns user/profile or error response
 */
export async function validateApiRole(
  allowedRoles: UserRole[]
): Promise<
  | { authorized: true; user: { id: string; email: string }; profile: { id: string; role: UserRole } }
  | { authorized: false; status: 401 | 403; error: string; message: string }
> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      authorized: false,
      status: 401,
      error: "UNAUTHORIZED",
      message: "Not authenticated",
    }
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single()

  const profile = profileData as { id: string; role: string } | null

  if (!profile) {
    return {
      authorized: false,
      status: 401,
      error: "UNAUTHORIZED",
      message: "Profile not found",
    }
  }

  const userRole = profile.role as UserRole

  if (!allowedRoles.includes(userRole)) {
    return {
      authorized: false,
      status: 403,
      error: "FORBIDDEN",
      message: "Insufficient permissions",
    }
  }

  return {
    authorized: true,
    user: { id: user.id, email: user.email! },
    profile: { id: profile.id, role: userRole },
  }
}
