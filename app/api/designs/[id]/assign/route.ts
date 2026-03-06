import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { assignDesignRequestSchema } from "@/lib/validations/designs"

/**
 * POST /api/designs/[id]/assign - Claim/unclaim/reassign a design request
 */
export async function POST(
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
    const { id: requestId } = await params
    const body = await request.json()

    // Validate input
    const parsed = assignDesignRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { action, assigneeId } = parsed.data

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("auth_user_id", user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // Handle claim
    if (action === "claim") {
      // Check if request exists and is unclaimed
      const { data: existingRequest } = await supabase
        .from("design_requests")
        .select("assigned_to")
        .eq("id", requestId)
        .single()

      if (!existingRequest) {
        return NextResponse.json({ error: "Request not found" }, { status: 404 })
      }

      if (existingRequest.assigned_to) {
        return NextResponse.json(
          { error: "Request is already claimed by another user" },
          { status: 400 }
        )
      }

      // Assign to current user
      const { error } = await supabase
        .from("design_requests")
        .update({
          assigned_to: profile.id,
          assigned_at: new Date().toISOString(),
          assigned_by: profile.id,
        })
        .eq("id", requestId)

      if (error) {
        console.error("Claim error:", error)
        return NextResponse.json(
          { error: "Failed to claim request" },
          { status: 500 }
        )
      }

      return NextResponse.json(
        { success: true, assignedTo: profile.id },
        { status: 200 }
      )
    }

    // Handle unclaim
    if (action === "unclaim") {
      // Check if request exists
      const { data: existingRequest } = await supabase
        .from("design_requests")
        .select("assigned_to, status")
        .eq("id", requestId)
        .single()

      if (!existingRequest) {
        return NextResponse.json({ error: "Request not found" }, { status: 404 })
      }

      // Only the assignee or an admin can unclaim
      const isAssignee = existingRequest.assigned_to === profile.id
      const isAdmin = profile.role === "admin" || profile.role === "lead_developer" || profile.role === "developer"
      
      if (!isAssignee && !isAdmin) {
        return NextResponse.json(
          { error: "You can only unclaim requests assigned to you" },
          { status: 403 }
        )
      }

      // Reset status to pending if currently in progress
      const updates: Record<string, unknown> = {
        assigned_to: null,
        assigned_at: null,
        assigned_by: null,
      }

      if (existingRequest.status === "in_progress") {
        updates.status = "pending"
      }

      const { error } = await supabase
        .from("design_requests")
        .update(updates)
        .eq("id", requestId)

      if (error) {
        console.error("Unclaim error:", error)
        return NextResponse.json(
          { error: "Failed to unclaim request" },
          { status: 500 }
        )
      }

      return NextResponse.json(
        { success: true, assignedTo: null },
        { status: 200 }
      )
    }

    // Handle reassign (admin/leader only)
    if (action === "reassign") {
      // Check role
      if (profile.role !== "admin" && profile.role !== "lead_developer" && profile.role !== "leader") {
        return NextResponse.json(
          { error: "Only admins and leaders can reassign requests" },
          { status: 403 }
        )
      }

      if (!assigneeId) {
        return NextResponse.json(
          { error: "Assignee ID is required for reassignment" },
          { status: 400 }
        )
      }

      // Verify new assignee exists
      const { data: newAssignee } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", assigneeId)
        .single()

      if (!newAssignee) {
        return NextResponse.json({ error: "Assignee not found" }, { status: 404 })
      }

      // Reassign
      const { error } = await supabase
        .from("design_requests")
        .update({
          assigned_to: assigneeId,
          assigned_at: new Date().toISOString(),
          assigned_by: profile.id,
        })
        .eq("id", requestId)

      if (error) {
        console.error("Reassign error:", error)
        return NextResponse.json(
          { error: "Failed to reassign request" },
          { status: 500 }
        )
      }

      return NextResponse.json(
        { success: true, assignedTo: assigneeId },
        { status: 200 }
      )
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    )
  } catch (error) {
    console.error("Unexpected error in POST /api/designs/[id]/assign:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
