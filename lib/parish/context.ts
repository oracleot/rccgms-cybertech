import { createClient } from "@/lib/supabase/server"
import type {
  Parish,
  ParishMembership,
  ParishRole,
  MembershipWithParish,
} from "./types"

export interface ParishContext {
  parish: Parish
  membership: ParishMembership
  parishRole: ParishRole
}

export interface FusionContext {
  user: { id: string; email: string }
  profile: { id: string; name: string; role: string; avatar_url: string | null }
  activeParish: ParishContext | null
  memberships: MembershipWithParish[]
}

export const ACTIVE_PARISH_COOKIE = "fusion_active_parish"

/**
 * Returns the profile ID for the authenticated user, or null.
 * Uses auth.uid() which maps to profiles.id via the auth_user_id trigger.
 */
async function getProfileId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .single()
  return data?.id ?? null
}

/**
 * Returns all active parish memberships for the current user, with parish
 * and organisation details.
 */
export async function getMyMemberships(): Promise<MembershipWithParish[]> {
  const profileId = await getProfileId()
  if (!profileId) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("parish_memberships")
    .select(`
      id, parish_id, profile_id, role, status,
      requested_at, approved_at, approved_by, created_at,
      parish:parishes (
        id, organisation_id, name, spiritual_expression,
        locality, region, country, slug, status, created_at, updated_at,
        organisation:organisations ( id, name, short_name, slug, status )
      )
    `)
    .eq("profile_id", profileId)
    .eq("status", "active")

  if (error || !data) return []

  return data.map((row) => ({
    id: row.id,
    parish_id: row.parish_id,
    profile_id: row.profile_id,
    role: row.role as ParishRole,
    status: row.status as "active",
    requested_at: row.requested_at,
    approved_at: row.approved_at,
    approved_by: row.approved_by,
    created_at: row.created_at,
    parish: row.parish
      ? {
          ...(row.parish as unknown as Parish),
          organisation: (row.parish as Record<string, unknown>)
            .organisation as MembershipWithParish["parish"] extends { organisation?: infer O } ? O : never,
        }
      : undefined,
  }))
}

/**
 * Reads the saved active-parish cookie. Returns null if unset or if cookies()
 * is unavailable in the current server context.
 */
async function readActiveParishCookie(): Promise<string | null> {
  try {
    const { cookies } = await import("next/headers")
    const cookieStore = await cookies()
    return cookieStore.get(ACTIVE_PARISH_COOKIE)?.value ?? null
  } catch {
    return null
  }
}

/**
 * Pure selection rule over the user's ACTIVE memberships. Never guesses.
 *
 * 1. Explicit requested parish (URL/API), if the user has an active membership
 * 2. fusion_active_parish cookie, if the user has an active membership there
 * 3. Exactly one active membership: auto-select it
 * 4. Otherwise (0, or 2+ without a valid choice): null. With 2+ memberships
 *    the caller must show the parish chooser; we NEVER silently take the first.
 */
export function selectActiveMembership(
  memberships: MembershipWithParish[],
  requestedParishId: string | null | undefined,
  cookieParishId: string | null | undefined,
): MembershipWithParish | null {
  if (memberships.length === 0) return null

  if (requestedParishId) {
    const m = memberships.find((x) => x.parish_id === requestedParishId)
    if (m) return m
  }

  if (cookieParishId) {
    const m = memberships.find((x) => x.parish_id === cookieParishId)
    if (m) return m
  }

  if (memberships.length === 1) return memberships[0]

  return null
}

function toParishContext(match: MembershipWithParish): ParishContext | null {
  if (!match.parish) return null
  return {
    parish: match.parish as Parish,
    membership: {
      id: match.id,
      parish_id: match.parish_id,
      profile_id: match.profile_id,
      role: match.role,
      status: match.status,
      requested_at: match.requested_at,
      approved_at: match.approved_at,
      approved_by: match.approved_by,
      created_at: match.created_at,
    },
    parishRole: match.role,
  }
}

/**
 * Resolves the active parish for the current user.
 *
 * Returns null if the user has no active memberships, or has several and has
 * not chosen one (no valid cookie) -- see selectActiveMembership.
 */
export async function resolveActiveParish(
  requestedParishId?: string | null,
): Promise<ParishContext | null> {
  const memberships = await getMyMemberships()
  if (memberships.length === 0) return null
  const cookieId = await readActiveParishCookie()
  const match = selectActiveMembership(memberships, requestedParishId, cookieId)
  return match ? toParishContext(match) : null
}

/**
 * Full Fusion context: user, profile, platform role, active parish, and
 * all memberships in a single call. activeParish is null when the user is
 * pending (0 memberships) or must choose (2+ memberships, no valid cookie).
 */
export async function getFusionContext(
  requestedParishId?: string | null,
): Promise<FusionContext | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, role, avatar_url")
    .eq("auth_user_id", user.id)
    .single()

  if (!profile) return null

  const memberships = await getMyMemberships()
  const cookieId = memberships.length > 1 ? await readActiveParishCookie() : null
  const match = selectActiveMembership(memberships, requestedParishId, cookieId)
  const activeParish = match ? toParishContext(match) : null

  return {
    user: { id: user.id, email: user.email! },
    profile: { id: profile.id, name: profile.name, role: profile.role, avatar_url: (profile as Record<string, unknown>).avatar_url as string | null },
    activeParish,
    memberships,
  }
}

/**
 * Returns the parish_id for the current user's active parish, or null.
 * Null means "pending" (0 memberships) or "must choose" (2+ memberships and
 * no valid fusion_active_parish cookie). Useful as a quick check in API routes.
 */
export async function getActiveParishId(
  requestedParishId?: string | null,
): Promise<string | null> {
  const ctx = await resolveActiveParish(requestedParishId)
  return ctx?.parish.id ?? null
}
