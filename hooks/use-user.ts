"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@/types/auth"
import type { UserRole } from "@/lib/constants"

interface ProfileData {
  id: string
  name: string
  avatar_url: string | null
  role: string
  department_id: string | null
  phone: string | null
}

interface UseUserReturn {
  user: User | null
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

/**
 * Hook to get the current authenticated user with their profile
 * Use this in client components that need user data
 */
export function useUser(): UseUserReturn {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchUser = useCallback(async () => {
    try {
      const supabase = createClient()

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()

      if (!authUser) {
        setUser(null)
        return
      }

      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, name, avatar_url, role, department_id, phone")
        .eq("auth_user_id", authUser.id)
        .single()

      const profile = profileData as ProfileData | null

      if (profileError || !profile) {
        console.error("Error fetching profile:", profileError)
        setUser(null)
        return
      }

      setUser({
        id: profile.id,
        email: authUser.email || "",
        name: profile.name,
        avatarUrl: profile.avatar_url,
        role: profile.role as UserRole,
        departmentId: profile.department_id,
        phone: profile.phone,
      })
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch user"))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUser()

    // Subscribe to auth state changes
    const supabase = createClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        fetchUser()
      } else if (event === "SIGNED_OUT") {
        setUser(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchUser])

  const refresh = useCallback(async () => {
    setIsLoading(true)
    await fetchUser()
  }, [fetchUser])

  const signOut = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
  }, [])

  return { user, isLoading, error, refresh, signOut }
}

/**
 * Hook to check if user has a specific role
 */
export function useHasRole(requiredRole: UserRole | UserRole[]): boolean {
  const { user } = useUser()

  if (!user) return false

  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
  return roles.includes(user.role)
}

/**
 * Hook to check if user is at least a specific role level
 * Role hierarchy: admin > leader > volunteer
 */
export function useHasMinimumRole(minRole: UserRole): boolean {
  const { user } = useUser()

  if (!user) return false

  const roleHierarchy: Record<UserRole, number> = {
    admin: 3,
    leader: 2,
    volunteer: 1,
  }

  const userLevel = roleHierarchy[user.role] || 0
  const requiredLevel = roleHierarchy[minRole] || 0

  return userLevel >= requiredLevel
}

/**
 * Hook to check if user is an admin
 */
export function useIsAdmin(): boolean {
  return useHasRole("admin")
}

/**
 * Hook to check if user is a leader or admin
 */
export function useIsLeader(): boolean {
  return useHasMinimumRole("leader")
}
