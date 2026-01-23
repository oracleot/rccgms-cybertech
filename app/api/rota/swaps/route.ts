import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createSwapRequestSchema, updateSwapRequestSchema } from "@/lib/validations/rota"
import { requireCurrentProfile } from "@/lib/auth/profile"

/**
 * POST /api/rota/swaps - Create a new swap request
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    // Validate input
    const parsed = createSwapRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    // Get current user profile (single query instead of auth + profile)
    let profile
    try {
      profile = await requireCurrentProfile()
    } catch {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Verify the assignment belongs to the requester
    const { data: assignmentResult } = await supabase
      .from("rota_assignments")
      .select("id, user_id, rota:rotas(date, status)")
      .eq("id", parsed.data.assignmentId)
      .single()

    if (!assignmentResult) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 })
    }

    const assignment = assignmentResult as { id: string; user_id: string; rota: { date: string; status: string } | null }

    if (assignment.user_id !== profile.id) {
      return NextResponse.json(
        { error: "You can only request swaps for your own assignments" },
        { status: 403 }
      )
    }

    if (!assignment.rota || assignment.rota.status !== "published") {
      return NextResponse.json(
        { error: "Can only request swaps for published rotas" },
        { status: 400 }
      )
    }

    // Check if swap request already exists for this assignment
    const { data: existingRequest } = await supabase
      .from("swap_requests")
      .select("id")
      .eq("original_assignment_id", parsed.data.assignmentId)
      .in("status", ["pending", "accepted"])
      .single()

    if (existingRequest) {
      return NextResponse.json(
        { error: "A swap request already exists for this assignment" },
        { status: 400 }
      )
    }

    // Handle "open" as no target user
    const targetUserId = parsed.data.targetUserId === "open" ? null : parsed.data.targetUserId

    // Create the swap request
    const insertData = {
      original_assignment_id: parsed.data.assignmentId,
      requester_id: profile.id,
      target_user_id: targetUserId || null,
      reason: parsed.data.reason || null,
      status: "pending" as const,
    }

    const { data: swapRequest, error } = await supabase
      .from("swap_requests")
      .insert(insertData as never)
      .select("id")
      .single()

    if (error || !swapRequest) {
      console.error("Error creating swap request:", error)
      return NextResponse.json(
        { error: "Failed to create swap request" },
        { status: 500 }
      )
    }

    const swapRequestData = swapRequest as { id: string }

    return NextResponse.json({ id: swapRequestData.id }, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/rota/swaps:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/rota/swaps - Update a swap request (accept/decline/approve/reject)
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    // Validate input
    const parsed = updateSwapRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { id, action } = parsed.data

    // Get current user profile (single query instead of auth + profile)
    let profile
    try {
      profile = await requireCurrentProfile()
    } catch {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Get the swap request
    const { data: swapRequestResult } = await supabase
      .from("swap_requests")
      .select("id, status, target_user_id, original_assignment_id, requester_id")
      .eq("id", id)
      .single()

    if (!swapRequestResult) {
      return NextResponse.json({ error: "Swap request not found" }, { status: 404 })
    }

    const swapRequest = swapRequestResult as { 
      id: string
      status: string
      target_user_id: string | null
      original_assignment_id: string
      requester_id: string
    }

    // Handle different actions
    switch (action) {
      case "accept": {
        if (swapRequest.status !== "pending") {
          return NextResponse.json(
            { error: "This request has already been processed" },
            { status: 400 }
          )
        }

        // For targeted requests, verify the current user is the target
        if (swapRequest.target_user_id && swapRequest.target_user_id !== profile.id) {
          return NextResponse.json(
            { error: "You are not authorized to accept this request" },
            { status: 403 }
          )
        }

        const acceptData = { 
          status: "accepted" as const,
          target_user_id: profile.id,
        }

        const { error: acceptError } = await supabase
          .from("swap_requests")
          .update(acceptData as never)
          .eq("id", id)

        if (acceptError) {
          return NextResponse.json(
            { error: "Failed to accept swap request" },
            { status: 500 }
          )
        }

        return NextResponse.json({ success: true })
      }

      case "decline": {
        if (swapRequest.status !== "pending") {
          return NextResponse.json(
            { error: "This request has already been processed" },
            { status: 400 }
          )
        }

        if (swapRequest.target_user_id && swapRequest.target_user_id !== profile.id) {
          return NextResponse.json(
            { error: "You are not authorized to decline this request" },
            { status: 403 }
          )
        }

        const declineData = { 
          status: "declined" as const,
          resolved_at: new Date().toISOString(),
          decline_reason: parsed.data.reason || null,
        }

        const { error: declineError } = await supabase
          .from("swap_requests")
          .update(declineData as never)
          .eq("id", id)

        if (declineError) {
          return NextResponse.json(
            { error: "Failed to decline swap request" },
            { status: 500 }
          )
        }

        return NextResponse.json({ success: true })
      }

      case "approve": {
        if (profile.role !== "admin" && profile.role !== "leader") {
          return NextResponse.json(
            { error: "Only leaders can approve swap requests" },
            { status: 403 }
          )
        }

        if (swapRequest.status !== "accepted") {
          return NextResponse.json(
            { error: "Can only approve requests that have been accepted" },
            { status: 400 }
          )
        }

        if (!swapRequest.target_user_id) {
          return NextResponse.json(
            { error: "No target user for this swap request" },
            { status: 400 }
          )
        }

        // Update the swap request status
        const approveData = { 
          status: "approved" as const,
          resolved_at: new Date().toISOString(),
        }

        const { error: approveError } = await supabase
          .from("swap_requests")
          .update(approveData as never)
          .eq("id", id)

        if (approveError) {
          return NextResponse.json(
            { error: "Failed to approve swap request" },
            { status: 500 }
          )
        }

        // Update the assignment to the new user
        const assignmentUpdate = { 
          user_id: swapRequest.target_user_id!,
          status: "pending" as const,
          confirmed_at: null,
        }

        const { error: assignmentError } = await supabase
          .from("rota_assignments")
          .update(assignmentUpdate as never)
          .eq("id", swapRequest.original_assignment_id)

        if (assignmentError) {
          // Try to rollback
          const rollbackData = { status: "accepted" as const, resolved_at: null }
          await supabase
            .from("swap_requests")
            .update(rollbackData as never)
            .eq("id", id)
          return NextResponse.json(
            { error: "Failed to update assignment" },
            { status: 500 }
          )
        }

        return NextResponse.json({ success: true })
      }

      case "reject": {
        if (profile.role !== "admin" && profile.role !== "leader") {
          return NextResponse.json(
            { error: "Only leaders can reject swap requests" },
            { status: 403 }
          )
        }

        if (swapRequest.status !== "accepted") {
          return NextResponse.json(
            { error: "Can only reject requests that have been accepted" },
            { status: 400 }
          )
        }

        const rejectData = { 
          status: "rejected" as const,
          resolved_at: new Date().toISOString(),
          decline_reason: parsed.data.reason || null,
        }

        const { error: rejectError } = await supabase
          .from("swap_requests")
          .update(rejectData as never)
          .eq("id", id)

        if (rejectError) {
          return NextResponse.json(
            { error: "Failed to reject swap request" },
            { status: 500 }
          )
        }

        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error("Error in PATCH /api/rota/swaps:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/rota/swaps - Get swap requests for current user
 * 
 * Query params:
 * - type: "incoming" | "outgoing" | "pending-approval" | "all"
 * - cursor: ISO timestamp for cursor-based pagination (created_at of last item)
 * - limit: number of items to return (default 20, max 100)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") // "incoming", "outgoing", "pending-approval", or "all"
    const cursor = searchParams.get("cursor") // ISO timestamp for pagination
    const limitParam = searchParams.get("limit")
    const limit = Math.min(Math.max(parseInt(limitParam || "20", 10), 1), 100)

    // Get current user profile (single query instead of auth + profile)
    let profile
    try {
      profile = await requireCurrentProfile()
    } catch {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Build query based on type
    let query = supabase
      .from("swap_requests")
      .select(`
        id,
        status,
        reason,
        created_at,
        resolved_at,
        requester:profiles!swap_requests_requester_id_fkey(id, name, avatar_url),
        target_user:profiles!swap_requests_target_user_id_fkey(id, name, avatar_url),
        original_assignment:rota_assignments!swap_requests_original_assignment_id_fkey(
          id,
          rota:rotas(date, service:services(name)),
          position:positions(name, department:departments(name))
        )
      `)
      .order("created_at", { ascending: false })
      .limit(limit + 1) // Fetch one extra to check if there are more

    // Apply cursor-based pagination
    if (cursor) {
      query = query.lt("created_at", cursor)
    }

    if (type === "incoming") {
      query = query.eq("target_user_id", profile.id)
    } else if (type === "outgoing") {
      query = query.eq("requester_id", profile.id)
    } else if (type === "pending-approval") {
      // Leaders only
      if (profile.role !== "admin" && profile.role !== "leader") {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 })
      }
      query = query.eq("status", "accepted")
    }
    // For "all" or undefined, return all requests the user is involved with
    else {
      query = query.or(`requester_id.eq.${profile.id},target_user_id.eq.${profile.id}`)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching swap requests:", error)
      return NextResponse.json(
        { error: "Failed to fetch swap requests" },
        { status: 500 }
      )
    }

    // Check if there are more results
    const hasMore = data && data.length > limit
    const requests = hasMore ? data.slice(0, limit) : (data || [])
    const nextCursor = hasMore && requests.length > 0 
      ? (requests[requests.length - 1] as { created_at: string }).created_at 
      : null

    return NextResponse.json({ 
      requests,
      pagination: {
        hasMore,
        nextCursor,
        limit
      }
    })
  } catch (error) {
    console.error("Error in GET /api/rota/swaps:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
