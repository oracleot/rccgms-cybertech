import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { updateDesignRequestSchema } from "@/lib/validations/designs"
import type { DesignRequestStatus as _DesignRequestStatus } from "@/types/designs"

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
 * GET /api/designs/[id] - Get a single design request by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const { id } = await params

    const { data, error } = await supabase
      .from("design_requests")
      .select(`
        *,
        assignee:profiles!design_requests_assigned_to_fkey(id, name, email),
        assigned_by_user:profiles!design_requests_assigned_by_fkey(id, name)
      `)
      .eq("id", id)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Design request not found" },
          { status: 404 }
        )
      }
      console.error("Error fetching design request:", error)
      return NextResponse.json(
        { error: "Failed to fetch design request" },
        { status: 500 }
      )
    }

    // Transform data to match expected format
    const transformedData = {
      id: data.id,
      title: data.title,
      description: data.description,
      type: data.request_type,
      priority: data.priority,
      status: data.status,
      requesterName: data.requester_name,
      requesterEmail: data.requester_email,
      requesterPhone: data.requester_phone,
      requesterMinistry: data.requester_ministry,
      neededBy: data.needed_by,
      referenceUrls: data.reference_urls || [],
      deliverableUrl: data.deliverable_url,
      revisionNotes: data.revision_notes,
      internalNotes: data.internal_notes,
      isArchived: data.is_archived,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      completedAt: data.completed_at,
      assignee: data.assignee
        ? {
            id: data.assignee.id,
            name: data.assignee.name,
            email: data.assignee.email,
          }
        : null,
      assignedAt: data.assigned_at,
      assignedBy: data.assigned_by_user
        ? {
            id: data.assigned_by_user.id,
            name: data.assigned_by_user.name,
          }
        : null,
    }

    return NextResponse.json(transformedData, { status: 200 })
  } catch (error) {
    console.error("Unexpected error in GET /api/designs/[id]:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/designs/[id] - Update a design request
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await request.json()

    // Validate input
    const parsed = updateDesignRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { status, priority, internalNotes, revisionNotes } = parsed.data

    // Get current request to validate transition
    const { data: currentRequest, error: fetchError } = await supabase
      .from("design_requests")
      .select("status, revision_notes, internal_notes")
      .eq("id", id)
      .single()

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Design request not found" },
          { status: 404 }
        )
      }
      console.error("Error fetching current request:", fetchError)
      return NextResponse.json(
        { error: "Failed to fetch design request" },
        { status: 500 }
      )
    }

    // Validate status transition
    if (status && status !== currentRequest.status) {
      const allowed = allowedTransitions[currentRequest.status as string] || []
      if (!allowed.includes(status)) {
        return NextResponse.json(
          {
            error: `Cannot transition from "${currentRequest.status}" to "${status}". Allowed: ${allowed.join(", ") || "none"}`,
          },
          { status: 400 }
        )
      }

      // Validate revision notes required for revision_requested
      if (status === "revision_requested" && !revisionNotes?.trim()) {
        return NextResponse.json(
          { error: "Revision notes are required when requesting revisions" },
          { status: 400 }
        )
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

    // Append revision notes with timestamp (for revision requests)
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
      .eq("id", id)

    if (updateError) {
      console.error("Error updating design request:", updateError)
      return NextResponse.json(
        { error: "Failed to update design request" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("Unexpected error in PATCH /api/designs/[id]:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/designs/[id] - Delete a design request (admin/leader only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const { id } = await params

    // Check user role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("auth_user_id", user.id)
      .single()

    if (!profile || (profile.role !== "admin" && profile.role !== "lead_developer" && profile.role !== "leader")) {
      return NextResponse.json(
        { error: "Only admins and leaders can delete requests" },
        { status: 403 }
      )
    }

    // Delete the request
    const { error } = await supabase
      .from("design_requests")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Error deleting design request:", error)
      return NextResponse.json(
        { error: "Failed to delete design request" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("Unexpected error in DELETE /api/designs/[id]:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
