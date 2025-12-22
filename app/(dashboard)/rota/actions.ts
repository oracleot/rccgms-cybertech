"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import {
  createRotaSchema,
  updateAssignmentsSchema,
  publishRotaSchema,
  type CreateRotaInput,
  type UpdateAssignmentsInput,
  type PublishRotaInput,
} from "@/lib/validations/rota"

export type ActionResult<T = void> = 
  | { success: true; data: T }
  | { success: false; error: string }

/**
 * Create a new rota for a service date
 */
export async function createRota(input: CreateRotaInput): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = createRotaSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

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

    if (profile.role !== "admin" && profile.role !== "leader") {
      return { success: false, error: "Only admins and leaders can create rotas" }
    }

    // Check if rota already exists for this date and service
    const { data: existing } = await supabase
      .from("rotas")
      .select("id")
      .eq("service_id", parsed.data.serviceId)
      .eq("date", parsed.data.date)
      .single()

    if (existing) {
      return { success: false, error: "A rota already exists for this service and date" }
    }

    // Create the rota - use any to bypass type inference issues
    const { data: rotaData, error } = await supabase
      .from("rotas")
      .insert({
        service_id: parsed.data.serviceId,
        date: parsed.data.date,
        status: "draft",
        created_by: profile.id,
      } as never)
      .select("id")
      .single()

    if (error || !rotaData) {
      console.error("Error creating rota:", error)
      return { success: false, error: "Failed to create rota" }
    }

    const rota = rotaData as { id: string }

    revalidatePath("/rota")
    return { success: true, data: { id: rota.id } }
  } catch (error) {
    console.error("Error in createRota:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

/**
 * Update assignments for a rota
 */
export async function updateRotaAssignments(input: UpdateAssignmentsInput): Promise<ActionResult> {
  try {
    const parsed = updateAssignmentsSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

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

    if (profile.role !== "admin" && profile.role !== "leader") {
      return { success: false, error: "Only admins and leaders can update assignments" }
    }

    // Delete existing assignments for this rota
    const { error: deleteError } = await supabase
      .from("rota_assignments")
      .delete()
      .eq("rota_id", parsed.data.rotaId)

    if (deleteError) {
      console.error("Error deleting existing assignments:", deleteError)
      return { success: false, error: "Failed to update assignments" }
    }

    // Insert new assignments
    if (parsed.data.assignments.length > 0) {
      const assignmentInserts = parsed.data.assignments.map((a) => ({
        rota_id: parsed.data.rotaId,
        user_id: a.userId,
        position_id: a.positionId,
        status: "pending",
      }))

      const { error: insertError } = await supabase
        .from("rota_assignments")
        .insert(assignmentInserts as never)

      if (insertError) {
        console.error("Error inserting assignments:", insertError)
        return { success: false, error: "Failed to create assignments" }
      }
    }

    revalidatePath(`/rota/${parsed.data.rotaId}`)
    revalidatePath("/rota")
    return { success: true, data: undefined }
  } catch (error) {
    console.error("Error in updateRotaAssignments:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

/**
 * Publish a rota (makes it visible to all volunteers)
 */
export async function publishRota(input: PublishRotaInput): Promise<ActionResult> {
  try {
    const parsed = publishRotaSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

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

    if (profile.role !== "admin" && profile.role !== "leader") {
      return { success: false, error: "Only admins and leaders can publish rotas" }
    }

    // Update rota status
    const { error } = await supabase
      .from("rotas")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
      } as never)
      .eq("id", parsed.data.rotaId)

    if (error) {
      console.error("Error publishing rota:", error)
      return { success: false, error: "Failed to publish rota" }
    }

    // Send notifications if requested
    if (parsed.data.notifyVolunteers) {
      // Notifications will be handled separately via lib/notifications
      // For now, just log that we should notify
      console.log("Should notify volunteers for rota:", parsed.data.rotaId)
    }

    revalidatePath(`/rota/${parsed.data.rotaId}`)
    revalidatePath("/rota")
    return { success: true, data: undefined }
  } catch (error) {
    console.error("Error in publishRota:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

/**
 * Delete a rota (only drafts)
 */
export async function deleteRota(rotaId: string): Promise<ActionResult> {
  try {
    if (!rotaId) {
      return { success: false, error: "Rota ID is required" }
    }

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

    if (profile.role !== "admin" && profile.role !== "leader") {
      return { success: false, error: "Only admins and leaders can delete rotas" }
    }

    // Check rota status (only allow deleting drafts)
    const { data: rotaData, error: rotaError } = await supabase
      .from("rotas")
      .select("status")
      .eq("id", rotaId)
      .single()

    if (rotaError || !rotaData) {
      return { success: false, error: "Rota not found" }
    }

    const rota = rotaData as { status: string }

    if (rota.status === "published") {
      return { success: false, error: "Cannot delete a published rota" }
    }

    // Delete the rota (cascade will handle assignments)
    const { error } = await supabase
      .from("rotas")
      .delete()
      .eq("id", rotaId)

    if (error) {
      console.error("Error deleting rota:", error)
      return { success: false, error: "Failed to delete rota" }
    }

    revalidatePath("/rota")
    return { success: true, data: undefined }
  } catch (error) {
    console.error("Error in deleteRota:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}
