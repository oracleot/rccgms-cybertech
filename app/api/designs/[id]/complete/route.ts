import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { completeDesignRequestSchema } from "@/lib/validations/designs"

/**
 * POST /api/designs/[id]/complete - Complete a design request with deliverable
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
    const parsed = completeDesignRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { deliverableFiles } = parsed.data

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("auth_user_id", user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // Get current request to validate
    const { data: existingRequest, error: fetchError } = await supabase
      .from("design_requests")
      .select("status, assigned_to")
      .eq("id", requestId)
      .single()

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return NextResponse.json(
          { error: "Design request not found" },
          { status: 404 }
        )
      }
      console.error("Error fetching request:", fetchError)
      return NextResponse.json(
        { error: "Failed to fetch design request" },
        { status: 500 }
      )
    }

    // Only assignee, admin, leader, or lead_developer can complete
    const isAssignee = existingRequest.assigned_to === profile.id
    const canApprove = ["admin", "lead_developer", "leader"].includes(profile.role)
    if (!isAssignee && !canApprove) {
      return NextResponse.json(
        { error: "You don't have permission to complete this request" },
        { status: 403 }
      )
    }

    // Status must be review to complete
    if (existingRequest.status !== "review") {
      return NextResponse.json(
        {
          error:
            "Request must be in 'Review' status before completing. Update status to 'Review' first.",
        },
        { status: 400 }
      )
    }

    // Complete the request
    const completedAt = new Date().toISOString()
    const { error: updateError } = await supabase
      .from("design_requests")
      .update({
        status: "completed",
        deliverable_files: deliverableFiles,
        completed_at: completedAt,
        updated_at: completedAt,
      })
      .eq("id", requestId)

    if (updateError) {
      console.error("Error completing request:", updateError)
      return NextResponse.json(
        { error: "Failed to complete request" },
        { status: 500 }
      )
    }

    // TODO: Queue notification to requester with deliverable link

    return NextResponse.json(
      { success: true, completedAt },
      { status: 200 }
    )
  } catch (error) {
    console.error("Unexpected error in POST /api/designs/[id]/complete:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
