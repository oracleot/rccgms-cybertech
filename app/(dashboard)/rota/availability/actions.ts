"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import {
  setAvailabilitySchema,
  bulkSetAvailabilitySchema,
  type SetAvailabilityInput,
  type BulkSetAvailabilityInput,
} from "@/lib/validations/rota"

export type ActionResult<T = void> = 
  | { success: true; data: T }
  | { success: false; error: string }

/**
 * Get current user's availability for a date range
 */
export async function getMyAvailability(
  startDate: string,
  endDate: string
): Promise<ActionResult<Array<{ date: string; isAvailable: boolean; notes: string | null }>>> {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { success: false, error: "Unauthorized" }
    }

    // Get profile
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .single()

    if (profileError || !profileData) {
      return { success: false, error: "Profile not found" }
    }

    const profile = profileData as { id: string }

    // Get availability records
    const { data: availabilityData, error } = await supabase
      .from("availability")
      .select("date, is_available, notes")
      .eq("user_id", profile.id)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true })

    if (error) {
      console.error("Error fetching availability:", error)
      return { success: false, error: "Failed to fetch availability" }
    }

    const availability = (availabilityData || []) as Array<{
      date: string
      is_available: boolean
      notes: string | null
    }>

    return {
      success: true,
      data: availability.map((a) => ({
        date: a.date,
        isAvailable: a.is_available,
        notes: a.notes,
      })),
    }
  } catch (error) {
    console.error("Error in getMyAvailability:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

/**
 * Set availability for a single date
 */
export async function setAvailability(input: SetAvailabilityInput): Promise<ActionResult> {
  try {
    const parsed = setAvailabilitySchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { success: false, error: "Unauthorized" }
    }

    // Get profile
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .single()

    if (profileError || !profileData) {
      return { success: false, error: "Profile not found" }
    }

    const profile = profileData as { id: string }

    // Upsert availability (insert or update)
    const { error } = await supabase
      .from("availability")
      .upsert(
        {
          user_id: profile.id,
          date: parsed.data.date,
          is_available: parsed.data.isAvailable,
          notes: parsed.data.notes || null,
        } as never,
        { onConflict: "user_id,date" }
      )

    if (error) {
      console.error("Error setting availability:", error)
      return { success: false, error: "Failed to set availability" }
    }

    revalidatePath("/rota/availability")
    revalidatePath("/rota/team-availability")
    return { success: true, data: undefined }
  } catch (error) {
    console.error("Error in setAvailability:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

/**
 * Set availability for multiple dates at once
 */
export async function bulkSetAvailability(input: BulkSetAvailabilityInput): Promise<ActionResult> {
  try {
    const parsed = bulkSetAvailabilitySchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { success: false, error: "Unauthorized" }
    }

    // Get profile
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .single()

    if (profileError || !profileData) {
      return { success: false, error: "Profile not found" }
    }

    const profile = profileData as { id: string }

    // Create upsert data for all dates
    const upsertData = parsed.data.dates.map((date) => ({
      user_id: profile.id,
      date,
      is_available: parsed.data.isAvailable,
      notes: parsed.data.notes || null,
    }))

    // Upsert all at once
    const { error } = await supabase
      .from("availability")
      .upsert(upsertData as never, { onConflict: "user_id,date" })

    if (error) {
      console.error("Error bulk setting availability:", error)
      return { success: false, error: "Failed to set availability" }
    }

    revalidatePath("/rota/availability")
    revalidatePath("/rota/team-availability")
    return { success: true, data: undefined }
  } catch (error) {
    console.error("Error in bulkSetAvailability:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

/**
 * Clear availability for a date (remove the record)
 */
export async function clearAvailability(date: string): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { success: false, error: "Unauthorized" }
    }

    // Get profile
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .single()

    if (profileError || !profileData) {
      return { success: false, error: "Profile not found" }
    }

    const profile = profileData as { id: string }

    // Delete the availability record
    const { error } = await supabase
      .from("availability")
      .delete()
      .eq("user_id", profile.id)
      .eq("date", date)

    if (error) {
      console.error("Error clearing availability:", error)
      return { success: false, error: "Failed to clear availability" }
    }

    revalidatePath("/rota/availability")
    revalidatePath("/rota/team-availability")
    return { success: true, data: undefined }
  } catch (error) {
    console.error("Error in clearAvailability:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

/**
 * Get team availability for a date range (Leaders only)
 */
export async function getTeamAvailability(
  startDate: string,
  endDate: string,
  departmentId?: string
): Promise<
  ActionResult<
    Array<{
      userId: string
      userName: string
      avatarUrl: string | null
      departmentName: string | null
      dates: Array<{ date: string; isAvailable: boolean; notes: string | null }>
    }>
  >
> {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { success: false, error: "Unauthorized" }
    }

    // Get profile with role
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("auth_user_id", user.id)
      .single()

    if (profileError || !profileData) {
      return { success: false, error: "Profile not found" }
    }

    const profile = profileData as { id: string; role: string }

    // Only leaders and admins can view team availability
    if (profile.role !== "admin" && profile.role !== "lead_developer" && profile.role !== "leader") {
      return { success: false, error: "Only leaders and admins can view team availability" }
    }

    // Build profiles query - fetch profiles separately from departments to avoid join issues
    let profilesQuery = supabase
      .from("profiles")
      .select("id, name, avatar_url, department_id")
      .order("name", { ascending: true })

    if (departmentId) {
      profilesQuery = profilesQuery.eq("department_id", departmentId)
    }

    const { data: profilesData, error: profilesError } = await profilesQuery

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError)
      return { success: false, error: `Failed to fetch team members: ${profilesError.message}` }
    }

    // Fetch departments separately
    const { data: departmentsData } = await supabase
      .from("departments")
      .select("id, name")

    const departmentMap = new Map(
      (departmentsData || []).map((d: { id: string; name: string }) => [d.id, d.name])
    )

    const profiles = (profilesData || []).map((p: { 
      id: string
      name: string
      avatar_url: string | null
      department_id: string | null 
    }) => ({
      id: p.id,
      name: p.name || "Unknown",
      avatar_url: p.avatar_url,
      departmentName: p.department_id ? departmentMap.get(p.department_id) || null : null,
    }))

    // Get all availability records for the date range
    const { data: availabilityData, error: availabilityError } = await supabase
      .from("availability")
      .select("user_id, date, is_available, notes")
      .gte("date", startDate)
      .lte("date", endDate)

    if (availabilityError) {
      console.error("Error fetching availability:", availabilityError)
      return { success: false, error: "Failed to fetch availability" }
    }

    const availability = (availabilityData || []) as Array<{
      user_id: string
      date: string
      is_available: boolean
      notes: string | null
    }>

    // Group availability by user
    const availabilityByUser: Record<
      string,
      Array<{ date: string; isAvailable: boolean; notes: string | null }>
    > = {}

    for (const a of availability) {
      if (!availabilityByUser[a.user_id]) {
        availabilityByUser[a.user_id] = []
      }
      availabilityByUser[a.user_id].push({
        date: a.date,
        isAvailable: a.is_available,
        notes: a.notes,
      })
    }

    // Combine profiles with their availability
    const result = profiles.map((p) => ({
      userId: p.id,
      userName: p.name,
      avatarUrl: p.avatar_url,
      departmentName: p.departmentName || null,
      dates: availabilityByUser[p.id] || [],
    }))

    return { success: true, data: result }
  } catch (error) {
    console.error("Error in getTeamAvailability:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}
