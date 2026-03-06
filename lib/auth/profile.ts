import { createClient } from "@/lib/supabase/server"

export interface CurrentProfile {
  id: string
  role: "admin" | "lead_developer" | "developer" | "leader" | "member"
  name: string
  email: string
  auth_user_id: string
}

/**
 * Get the current authenticated user's profile in a single query.
 * This avoids N+1 patterns where we first get auth user, then query profiles.
 * 
 * @returns The current user's profile or null if not authenticated
 * @throws Error if there's a database error (not auth error)
 */
export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return null
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, name, email, auth_user_id")
    .eq("auth_user_id", user.id)
    .single()

  if (error) {
    // PGRST116 = no rows found, which means profile doesn't exist
    if (error.code === "PGRST116") {
      return null
    }
    throw new Error(`Failed to get profile: ${error.message}`)
  }

  return profile as CurrentProfile
}

/**
 * Get the current authenticated user's profile, throwing if not authenticated.
 * Use this in routes that require authentication.
 * 
 * @returns The current user's profile
 * @throws Error if not authenticated or profile not found
 */
export async function requireCurrentProfile(): Promise<CurrentProfile> {
  const profile = await getCurrentProfile()
  
  if (!profile) {
    throw new Error("Not authenticated")
  }
  
  return profile
}

/**
 * Check if the current user has one of the specified roles.
 * 
 * @param roles - Array of allowed roles
 * @returns true if user has one of the roles
 */
export async function hasRole(roles: Array<"admin" | "lead_developer" | "developer" | "leader" | "member">): Promise<boolean> {
  const profile = await getCurrentProfile()
  return profile !== null && roles.includes(profile.role)
}
