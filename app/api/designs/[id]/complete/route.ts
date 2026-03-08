import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * POST /api/designs/[id]/complete - Approve and complete a design request (senior roles only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const { id: requestId } = await params

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("auth_user_id", user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // Only admin, leader, or lead_developer can approve
    if (!["admin", "lead_developer", "leader"].includes(profile.role)) {
      return NextResponse.json(
        { error: "Only admins, leaders, and lead developers can approve requests" },
        { status: 403 }
      )
    }

    // Get current request
    const { data: existingRequest, error: fetchError } = await supabase
      .from("design_requests")
      .select("status")
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

    // Status must be review to approve
    if (existingRequest.status !== "review") {
      return NextResponse.json(
        { error: "Request must be in 'Review' status before approving." },
        { status: 400 }
      )
    }

    // Approve: mark as completed
    const completedAt = new Date().toISOString()
    const { error: updateError } = await supabase
      .from("design_requests")
      .update({
        status: "completed",
        completed_at: completedAt,
        updated_at: completedAt,
      })
      .eq("id", requestId)

    if (updateError) {
      console.error("Error approving request:", updateError)
      return NextResponse.json(
        { error: "Failed to approve request" },
        { status: 500 }
      )
    }

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
