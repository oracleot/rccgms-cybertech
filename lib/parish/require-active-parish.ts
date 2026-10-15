import { createClient } from "@/lib/supabase/server"
import { getActiveParishId } from "./context"
import type { ParishRole } from "./types"
import { PARISH_ROLE_HIERARCHY } from "./types"

export type ParishAuthSuccess = {
  profileId: string
  parishId: string
  parishRole: ParishRole
  isPlatformDeveloper: boolean
}

export type ParishAuthFailure = {
  error: string
  status: 401 | 403
}

export type ParishAuthResult = ParishAuthSuccess | ParishAuthFailure

function isFailure(r: ParishAuthResult): r is ParishAuthFailure {
  return "error" in r
}

export { isFailure as isParishAuthFailure }

async function resolveParishAuth(
  minRole: ParishRole,
): Promise<ParishAuthResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated", status: 401 }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single()

  if (!profile) return { error: "Profile not found", status: 401 }

  const platformRole = (profile as { id: string; role: string }).role
  const isPlatformDeveloper =
    platformRole === "lead_developer" || platformRole === "developer"

  if (isPlatformDeveloper) {
    const parishId = await getActiveParishId()
    return {
      profileId: profile.id,
      parishId: parishId ?? "",
      parishRole: "parish_admin" as ParishRole,
      isPlatformDeveloper: true,
    }
  }

  const parishId = await getActiveParishId()
  if (!parishId) return { error: "No active parish", status: 403 }

  const { data: membership } = await supabase
    .from("parish_memberships")
    .select("role")
    .eq("parish_id", parishId)
    .eq("profile_id", profile.id)
    .eq("status", "active")
    .single()

  if (!membership) return { error: "Not a member of this parish", status: 403 }

  const role = membership.role as ParishRole
  const userLevel = PARISH_ROLE_HIERARCHY[role] ?? 0
  const requiredLevel = PARISH_ROLE_HIERARCHY[minRole] ?? 0

  if (userLevel < requiredLevel) {
    return { error: "Insufficient parish role", status: 403 }
  }

  return {
    profileId: profile.id,
    parishId,
    parishRole: role,
    isPlatformDeveloper: false,
  }
}

export async function requireActiveParishAdmin(): Promise<ParishAuthResult> {
  return resolveParishAuth("parish_admin")
}

export async function requireActiveParishLeader(): Promise<ParishAuthResult> {
  return resolveParishAuth("leader")
}

export async function requireActiveParishOperator(): Promise<ParishAuthResult> {
  return resolveParishAuth("operator")
}

export async function requireActiveParishMember(): Promise<ParishAuthResult> {
  return resolveParishAuth("member")
}
