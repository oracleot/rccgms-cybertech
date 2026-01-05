"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import {
  assignDesignRequestSchema,
  type AssignDesignRequestInput,
} from "@/lib/validations/designs"

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

/**
 * Claim a design request (assign to current user)
 */
export async function claimRequest(requestId: string): Promise<ActionResult> {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .single()

  if (!profile) {
    return { success: false, error: "Profile not found" }
  }

  // Check if request exists and is unclaimed
  const { data: request } = await supabase
    .from("design_requests")
    .select("assigned_to")
    .eq("id", requestId)
    .single()

  if (!request) {
    return { success: false, error: "Request not found" }
  }

  if (request.assigned_to) {
    return { success: false, error: "Request is already claimed by another user" }
  }

  // Assign to current user and update status
  const { error } = await supabase
    .from("design_requests")
    .update({
      assigned_to: profile.id,
      assigned_at: new Date().toISOString(),
      assigned_by: profile.id,
      status: "in_progress",
    })
    .eq("id", requestId)

  if (error) {
    console.error("Claim error:", error)
    return { success: false, error: "Failed to claim request" }
  }

  revalidatePath("/designs")
  revalidatePath(`/designs/${requestId}`)
  return { success: true, data: undefined }
}

/**
 * Unclaim a design request (remove assignment)
 */
export async function unclaimRequest(requestId: string): Promise<ActionResult> {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .single()

  if (!profile) {
    return { success: false, error: "Profile not found" }
  }

  // Check if request is assigned to current user
  const { data: request } = await supabase
    .from("design_requests")
    .select("assigned_to, status")
    .eq("id", requestId)
    .single()

  if (!request) {
    return { success: false, error: "Request not found" }
  }

  if (request.assigned_to !== profile.id) {
    return { success: false, error: "You can only unclaim requests assigned to you" }
  }

  // Reset status to pending if currently in progress
  const updates: Record<string, unknown> = {
    assigned_to: null,
    assigned_at: null,
    assigned_by: null,
  }

  if (request.status === "in_progress") {
    updates.status = "pending"
  }

  const { error } = await supabase
    .from("design_requests")
    .update(updates)
    .eq("id", requestId)

  if (error) {
    console.error("Unclaim error:", error)
    return { success: false, error: "Failed to unclaim request" }
  }

  revalidatePath("/designs")
  revalidatePath(`/designs/${requestId}`)
  return { success: true, data: undefined }
}

/**
 * Reassign a design request to another user (admin/leader only)
 */
export async function reassignRequest(
  requestId: string,
  newAssigneeId: string
): Promise<ActionResult> {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  // Get user profile and check role
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single()

  if (!profile) {
    return { success: false, error: "Profile not found" }
  }

  if (profile.role !== "admin" && profile.role !== "leader") {
    return { success: false, error: "Only admins and leaders can reassign requests" }
  }

  // Verify new assignee exists
  const { data: newAssignee } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", newAssigneeId)
    .single()

  if (!newAssignee) {
    return { success: false, error: "Assignee not found" }
  }

  // Reassign
  const { error } = await supabase
    .from("design_requests")
    .update({
      assigned_to: newAssigneeId,
      assigned_at: new Date().toISOString(),
      assigned_by: profile.id,
    })
    .eq("id", requestId)

  if (error) {
    console.error("Reassign error:", error)
    return { success: false, error: "Failed to reassign request" }
  }

  revalidatePath("/designs")
  revalidatePath(`/designs/${requestId}`)
  return { success: true, data: undefined }
}
