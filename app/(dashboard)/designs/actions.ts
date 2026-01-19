"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { updateDesignRequestSchema, type UpdateDesignRequestInput } from "@/lib/validations/designs"
import {
  notifyRequesterClaimed,
  notifyRequesterReview,
  notifyDesignerRevision,
  notifyRequesterCompleted,
} from "@/lib/notifications/design-notifications"
import type { DesignRequestStatus as _DesignRequestStatus } from "@/types/designs"

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

// Status transition rules
const allowedTransitions: Record<string, string[]> = {
  pending: ["in_progress", "cancelled"],
  submitted: ["in_progress", "cancelled"],
  in_progress: ["review", "cancelled"],
  review: ["revision_requested", "in_progress", "completed", "cancelled"],
  revision_requested: ["in_progress", "cancelled"],
  completed: [], // Terminal state
  cancelled: [], // Terminal state
}

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
    .select("id, name")
    .eq("auth_user_id", user.id)
    .single()

  if (!profile) {
    return { success: false, error: "Profile not found" }
  }

  // Check if request exists and is unclaimed, also get requester info for notification
  const { data: request } = await supabase
    .from("design_requests")
    .select("id, title, assigned_to, requester_name, requester_email")
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

  // Send notification to requester
  try {
    if (request.requester_email) {
      await notifyRequesterClaimed({
        requestId: request.id,
        title: request.title,
        requesterName: request.requester_name || "Requester",
        requesterEmail: request.requester_email,
        designerName: profile.name || "A team member",
      })
    }
  } catch (notifyError) {
    console.error("Failed to send claimed notification:", notifyError)
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

  // Get user profile with role
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single()

  if (!profile) {
    return { success: false, error: "Profile not found" }
  }

  // Check if request exists
  const { data: request } = await supabase
    .from("design_requests")
    .select("assigned_to, status")
    .eq("id", requestId)
    .single()

  if (!request) {
    return { success: false, error: "Request not found" }
  }

  // Only the assignee or an admin can unclaim
  const isAssignee = request.assigned_to === profile.id
  const isAdmin = profile.role === "admin"
  
  if (!isAssignee && !isAdmin) {
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

/**
 * Update a design request's status, priority, or notes
 */
export async function updateRequest(
  requestId: string,
  input: UpdateDesignRequestInput
): Promise<ActionResult> {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  // Validate input
  const parsed = updateDesignRequestSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const { status, priority, internalNotes, revisionNotes } = parsed.data

  // Get current request to validate transition and append notes
  const { data: currentRequest, error: fetchError } = await supabase
    .from("design_requests")
    .select("id, title, status, revision_notes, internal_notes, requester_name, requester_email, assigned_to")
    .eq("id", requestId)
    .single()

  if (fetchError) {
    console.error("Error fetching current request:", fetchError)
    return { success: false, error: "Request not found" }
  }

  // Validate status transition
  if (status && status !== currentRequest.status) {
    const allowed = allowedTransitions[currentRequest.status as string] || []
    if (!allowed.includes(status)) {
      return {
        success: false,
        error: `Cannot transition from "${currentRequest.status}" to "${status}"`,
      }
    }

    // Validate revision notes required for revision_requested
    if (status === "revision_requested" && !revisionNotes?.trim()) {
      return {
        success: false,
        error: "Revision notes are required when requesting revisions",
      }
    }
  }

  // Build update object
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (status) {
    updates.status = status
  }

  if (priority) {
    updates.priority = priority
  }

  // Append internal notes with timestamp
  if (internalNotes?.trim()) {
    const timestamp = new Date().toISOString()
    const newNote = `[${timestamp}] ${internalNotes.trim()}`
    updates.internal_notes = currentRequest.internal_notes
      ? `${currentRequest.internal_notes}\n\n${newNote}`
      : newNote
  }

  // Append revision notes with timestamp
  if (revisionNotes?.trim()) {
    const timestamp = new Date().toISOString()
    const newNote = `[${timestamp}] ${revisionNotes.trim()}`
    updates.revision_notes = currentRequest.revision_notes
      ? `${currentRequest.revision_notes}\n\n${newNote}`
      : newNote
  }

  const { error: updateError } = await supabase
    .from("design_requests")
    .update(updates)
    .eq("id", requestId)

  if (updateError) {
    console.error("Update error:", updateError)
    return { success: false, error: "Failed to update request" }
  }

  // Send notifications based on status change
  try {
    if (status === "review" && status !== currentRequest.status) {
      // Notify requester that design is ready for review
      if (currentRequest.requester_email) {
        await notifyRequesterReview({
          requestId: currentRequest.id,
          title: currentRequest.title,
          requesterName: currentRequest.requester_name || "Requester",
          requesterEmail: currentRequest.requester_email,
        })
      }
    } else if (status === "revision_requested" && status !== currentRequest.status) {
      // Notify designer about revision request
      if (currentRequest.assigned_to) {
        // Get designer email
        const { data: designer } = await supabase
          .from("profiles")
          .select("name, email")
          .eq("id", currentRequest.assigned_to)
          .single()

        if (designer?.email) {
          await notifyDesignerRevision({
            requestId: currentRequest.id,
            title: currentRequest.title,
            designerName: designer.name || "Team member",
            designerEmail: designer.email,
            revisionNotes: revisionNotes || "",
          })
        }
      }
    }
  } catch (notifyError) {
    console.error("Failed to send status update notification:", notifyError)
  }

  revalidatePath("/designs")
  revalidatePath(`/designs/${requestId}`)
  return { success: true, data: undefined }
}

/**
 * Complete a design request with a deliverable URL
 */
export async function completeRequest(
  requestId: string,
  deliverableUrl: string
): Promise<ActionResult> {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  // Validate URL
  try {
    new URL(deliverableUrl)
  } catch {
    return { success: false, error: "Please enter a valid URL" }
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

  // Get current request to validate
  const { data: request, error: fetchError } = await supabase
    .from("design_requests")
    .select("id, title, status, assigned_to, requester_name, requester_email")
    .eq("id", requestId)
    .single()

  if (fetchError) {
    console.error("Error fetching request:", fetchError)
    return { success: false, error: "Request not found" }
  }

  // Only the assignee can complete
  if (request.assigned_to !== profile.id) {
    return { success: false, error: "Only the assigned designer can complete this request" }
  }

  // Status must be review to complete
  if (request.status !== "review") {
    return {
      success: false,
      error: "Request must be in 'Review' status before completing. Update status to 'Review' first.",
    }
  }

  // Complete the request
  const { error: updateError } = await supabase
    .from("design_requests")
    .update({
      status: "completed",
      deliverable_url: deliverableUrl,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)

  if (updateError) {
    console.error("Complete error:", updateError)
    return { success: false, error: "Failed to complete request" }
  }

  // Send notification to requester
  try {
    if (request.requester_email) {
      await notifyRequesterCompleted({
        requestId: request.id,
        title: request.title,
        requesterName: request.requester_name || "Requester",
        requesterEmail: request.requester_email,
        deliverableUrl,
      })
    }
  } catch (notifyError) {
    console.error("Failed to send completed notification:", notifyError)
  }

  revalidatePath("/designs")
  revalidatePath(`/designs/${requestId}`)
  return { success: true, data: undefined }
}

/**
 * Delete a design request (admin/leader only)
 */
export async function deleteRequest(requestId: string): Promise<ActionResult> {
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
    .select("role")
    .eq("auth_user_id", user.id)
    .single()

  if (!profile) {
    return { success: false, error: "Profile not found" }
  }

  if (profile.role !== "admin" && profile.role !== "leader") {
    return { success: false, error: "Only admins and leaders can delete requests" }
  }

  // Delete the request
  const { error } = await supabase
    .from("design_requests")
    .delete()
    .eq("id", requestId)

  if (error) {
    console.error("Delete error:", error)
    return { success: false, error: "Failed to delete request" }
  }

  revalidatePath("/designs")
  return { success: true, data: undefined }
}
