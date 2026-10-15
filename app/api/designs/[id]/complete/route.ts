import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireActiveParishLeader, isParishAuthFailure } from "@/lib/parish/require-active-parish"

/**
 * POST /api/designs/[id]/complete - Approve and complete a design request (senior roles only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: requestId } = await params

    const auth = await requireActiveParishLeader()
    if (isParishAuthFailure(auth)) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const supabase = await createClient()

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
