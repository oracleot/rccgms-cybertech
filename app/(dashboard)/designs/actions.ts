"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import {
  updateDesignRequestSchema,
  reassignMultiSchema,
  createSubIssueSchema,
  type UpdateDesignRequestInput,
  type ReassignMultiInput,
  type CreateSubIssueInput,
} from "@/lib/validations/designs"
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
  review: ["revision_requested", "in_progress", "cancelled"],
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

  // Also insert into junction table as lead assignee
  const { error: upsertError } = await supabase
    .from("design_request_assignments")
    .upsert(
      {
        request_id: requestId,
        profile_id: profile.id,
        is_lead: true,
        assigned_at: new Date().toISOString(),
        assigned_by: profile.id,
      },
      { onConflict: "request_id,profile_id" }
    )

  if (upsertError) {
    console.error("Failed to sync assignment junction table:", upsertError)
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
 * Admin: can unclaim freely
 * Developer: can unclaim but must provide a reason
 * Designers cannot self-unclaim
 */
export async function unclaimRequest(
  requestId: string,
  reason?: string
): Promise<ActionResult> {
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
    .select("id, role, name")
    .eq("auth_user_id", user.id)
    .single()

  if (!profile) {
    return { success: false, error: "Profile not found" }
  }

  // Only admin (free) or developer (with reason) can unclaim
  const isAdmin = profile.role === "admin"
  const isDeveloper = profile.role === "developer"

  if (!isAdmin && !isDeveloper) {
    return { success: false, error: "Only admins and developers can unclaim design requests" }
  }

  // Developer must provide a reason
  if (isDeveloper && !reason?.trim()) {
    return { success: false, error: "A reason is required when unclaiming as a developer" }
  }

  // Check if request exists and is assigned
  const { data: request } = await supabase
    .from("design_requests")
    .select("assigned_to, status, internal_notes")
    .eq("id", requestId)
    .single()

  if (!request) {
    return { success: false, error: "Request not found" }
  }

  if (!request.assigned_to) {
    return { success: false, error: "Request is not assigned to anyone" }
  }

  // Block self-unclaim: designers cannot unclaim their own requests
  if (request.assigned_to === profile.id) {
    return { success: false, error: "You cannot unclaim a request assigned to yourself" }
  }

  const isTerminal = request.status === "completed" || request.status === "cancelled"
  if (isTerminal) {
    return { success: false, error: "Cannot unclaim a completed or cancelled request" }
  }

  // Reset status to pending from any non-terminal status and clear deliverables
  const updates: Record<string, unknown> = {
    assigned_to: null,
    assigned_at: null,
    assigned_by: null,
    status: "pending",
    deliverable_files: [],
  }

  // Log reason to internal notes if developer
  if (isDeveloper && reason?.trim()) {
    const timestamp = new Date().toISOString()
    const newNote = `[${timestamp}] UNCLAIM by ${profile.name || "Developer"}: ${reason.trim()}`
    updates.internal_notes = request.internal_notes
      ? `${request.internal_notes}\n\n${newNote}`
      : newNote
  }

  const { error } = await supabase
    .from("design_requests")
    .update(updates)
    .eq("id", requestId)

  if (error) {
    console.error("Unclaim error:", error)
    return { success: false, error: "Failed to unclaim request" }
  }

  // Also clear all assignments from junction table
  await supabase
    .from("design_request_assignments")
    .delete()
    .eq("request_id", requestId)

  revalidatePath("/designs")
  revalidatePath(`/designs/${requestId}`)
  return { success: true, data: undefined }
}

/**
 * Reassign a design request to one or more users (admin/leader only)
 * Supports multi-assignee with lead designation and optional deadline
 */
export async function reassignRequest(
  requestId: string,
  newAssigneeId: string,
  input?: ReassignMultiInput
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

  if (profile.role !== "admin" && profile.role !== "lead_developer" && profile.role !== "leader" && profile.role !== "developer") {
    return { success: false, error: "Only admins, leaders, and developers can reassign requests" }
  }

  // Multi-assignee path
  if (input) {
    const parsed = reassignMultiSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    const { assignees, deadline } = parsed.data
    const leadAssignee = assignees.find((a) => a.isLead)!

    // Validate all assignees exist
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, role")
      .in(
        "id",
        assignees.map((a) => a.profileId)
      )

    if (!profiles || profiles.length !== assignees.length) {
      return { success: false, error: "One or more assignees not found" }
    }

    // Leader restriction: can only assign to members or other leaders
    if (profile.role === "leader") {
      const invalid = profiles.find(
        (p) => p.role !== "member" && p.role !== "leader"
      )
      if (invalid) {
        return { success: false, error: "Leaders can only assign designs to members or other leaders" }
      }
    }

    // Update lead assignee on design_requests (denormalized)
    const updateData: Record<string, unknown> = {
      assigned_to: leadAssignee.profileId,
      assigned_at: new Date().toISOString(),
      assigned_by: profile.id,
    }
    if (deadline !== undefined) {
      updateData.deadline = deadline
    }

    const { error: updateError } = await supabase
      .from("design_requests")
      .update(updateData)
      .eq("id", requestId)

    if (updateError) {
      console.error("Reassign update error:", updateError)
      return { success: false, error: "Failed to reassign request" }
    }

    // Replace all junction table entries
    await supabase
      .from("design_request_assignments")
      .delete()
      .eq("request_id", requestId)

    const { error: insertError } = await supabase
      .from("design_request_assignments")
      .insert(
        assignees.map((a) => ({
          request_id: requestId,
          profile_id: a.profileId,
          is_lead: a.isLead,
          assigned_at: new Date().toISOString(),
          assigned_by: profile.id,
        }))
      )

    if (insertError) {
      console.error("Reassign junction insert error:", insertError)
      return { success: false, error: "Failed to save assignee list" }
    }

    revalidatePath("/designs")
    revalidatePath(`/designs/${requestId}`)
    return { success: true, data: undefined }
  }

  // Legacy single-assignee path (backward compat)
  // Verify new assignee exists
  const { data: newAssignee } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", newAssigneeId)
    .single()

  if (!newAssignee) {
    return { success: false, error: "Assignee not found" }
  }

  if (profile.role === "leader") {
    if (newAssignee.role !== "member" && newAssignee.role !== "leader") {
      return { success: false, error: "Leaders can only assign designs to members or other leaders" }
    }
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

  // Sync junction table
  await supabase
    .from("design_request_assignments")
    .delete()
    .eq("request_id", requestId)

  await supabase
    .from("design_request_assignments")
    .insert({
      request_id: requestId,
      profile_id: newAssigneeId,
      is_lead: true,
      assigned_at: new Date().toISOString(),
      assigned_by: profile.id,
    })

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

  const { status, priority, internalNotes, revisionNotes, deliverableFiles } = parsed.data

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

  // Save deliverable files when transitioning to review
  if (deliverableFiles && deliverableFiles.length > 0) {
    updates.deliverable_files = deliverableFiles
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
 * Approve a design request (senior roles only)
 * Marks a reviewed request as completed
 */
export async function approveRequest(
  requestId: string
): Promise<ActionResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single()

  if (!profile) {
    return { success: false, error: "Profile not found" }
  }

  // Only admin, leader, or lead_developer can approve
  if (!["admin", "lead_developer", "leader"].includes(profile.role)) {
    return { success: false, error: "Only admins, leaders, and lead developers can approve requests" }
  }

  const { data: request, error: fetchError } = await supabase
    .from("design_requests")
    .select("id, title, status, requester_name, requester_email, deliverable_files")
    .eq("id", requestId)
    .single()

  if (fetchError) {
    console.error("Error fetching request:", fetchError)
    return { success: false, error: "Request not found" }
  }

  if (request.status !== "review") {
    return {
      success: false,
      error: "Request must be in 'Review' status before approving.",
    }
  }

  // Require at least one deliverable file before completing
  const files = Array.isArray(request.deliverable_files) ? request.deliverable_files : []
  if (files.length === 0) {
    return {
      success: false,
      error: "At least one deliverable file is required before approving this request.",
    }
  }

  const { error: updateError } = await supabase
    .from("design_requests")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)

  if (updateError) {
    console.error("Approve error:", updateError)
    return { success: false, error: "Failed to approve request" }
  }

  // Send notification to requester
  try {
    if (request.requester_email) {
      await notifyRequesterCompleted({
        requestId: request.id,
        title: request.title,
        requesterName: request.requester_name || "Requester",
        requesterEmail: request.requester_email,
        deliverableUrl: "Design files available in the app",
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

  if (profile.role !== "admin" && profile.role !== "lead_developer" && profile.role !== "leader") {
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

/**
 * Create a sub-issue for a design request
 * Inherits requester info from parent, allows custom title/desc/priority
 */
export async function createSubIssue(
  input: CreateSubIssueInput
): Promise<ActionResult<string>> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single()

  if (!profile) {
    return { success: false, error: "Profile not found" }
  }

  // Only team members with appropriate roles can create sub-issues
  if (!["admin", "lead_developer", "leader", "developer"].includes(profile.role)) {
    return { success: false, error: "You don't have permission to create sub-issues" }
  }

  const parsed = createSubIssueSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  // Get parent request for requester info
  const { data: parent } = await supabase
    .from("design_requests")
    .select("id, requester_name, requester_email, requester_phone, requester_ministry, request_type, parent_id")
    .eq("id", parsed.data.parentId)
    .single()

  if (!parent) {
    return { success: false, error: "Parent request not found" }
  }

  // Prevent deeply nested sub-issues (max 1 level)
  if (parent.parent_id) {
    return { success: false, error: "Cannot create a sub-issue of a sub-issue" }
  }

  const { data: newRequest, error } = await supabase
    .from("design_requests")
    .insert({
      title: parsed.data.title,
      description: parsed.data.description,
      priority: parsed.data.priority || "medium",
      parent_id: parsed.data.parentId,
      needed_by: parsed.data.neededBy || null,
      requester_name: parent.requester_name,
      requester_email: parent.requester_email,
      requester_phone: parent.requester_phone,
      requester_ministry: parent.requester_ministry,
      request_type: parent.request_type,
    })
    .select("id")
    .single()

  if (error) {
    console.error("Create sub-issue error:", error)
    return { success: false, error: "Failed to create sub-issue" }
  }

  revalidatePath("/designs")
  revalidatePath(`/designs/${parsed.data.parentId}`)
  return { success: true, data: newRequest.id }
}

/**
 * Update deadline and delay reason for a design request
 */
export async function updateDeadline(
  requestId: string,
  deadline: string | null,
  delayReason?: string
): Promise<ActionResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single()

  if (!profile) {
    return { success: false, error: "Profile not found" }
  }

  if (!["admin", "lead_developer", "leader"].includes(profile.role)) {
    return { success: false, error: "Only admins and leaders can update deadlines" }
  }

  const updates: Record<string, unknown> = {
    deadline,
    updated_at: new Date().toISOString(),
  }

  if (delayReason?.trim()) {
    updates.delay_reason = delayReason.trim()
  }

  const { error } = await supabase
    .from("design_requests")
    .update(updates)
    .eq("id", requestId)

  if (error) {
    console.error("Update deadline error:", error)
    return { success: false, error: "Failed to update deadline" }
  }

  revalidatePath("/designs")
  revalidatePath(`/designs/${requestId}`)
  return { success: true, data: undefined }
}
