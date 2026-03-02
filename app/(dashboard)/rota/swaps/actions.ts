"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { 
  createSwapRequestSchema, 
  type CreateSwapRequestInput,
} from "@/lib/validations/rota"

interface ActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Create a new swap request
 */
export async function createSwapRequest(
  input: CreateSwapRequestInput
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient()

  // Validate input
  const parsed = createSwapRequestSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  // Get user's profile ID
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .single()

  if (!profile) {
    return { success: false, error: "Profile not found" }
  }

  const profileData = profile as { id: string }

  // Verify the assignment belongs to the requester
  const { data: assignmentData } = await supabase
    .from("rota_assignments")
    .select("id, user_id, rota:rotas(date, status)")
    .eq("id", parsed.data.assignmentId)
    .single()

  if (!assignmentData) {
    return { success: false, error: "Assignment not found" }
  }

  const assignment = assignmentData as { id: string; user_id: string; rota: { date: string; status: string } | null }

  if (assignment.user_id !== profileData.id) {
    return { success: false, error: "You can only request swaps for your own assignments" }
  }

  if (!assignment.rota || assignment.rota.status !== "published") {
    return { success: false, error: "Can only request swaps for published rotas" }
  }

  // Check if swap request already exists for this assignment
  const { data: existingRequest } = await supabase
    .from("swap_requests")
    .select("id")
    .eq("original_assignment_id", parsed.data.assignmentId)
    .in("status", ["pending", "accepted"])
    .single()

  if (existingRequest) {
    return { success: false, error: "A swap request already exists for this assignment" }
  }

  // Handle "open" as no target user
  const targetUserId = parsed.data.targetUserId === "open" ? null : parsed.data.targetUserId

  // Create the swap request
  const insertData = {
    original_assignment_id: parsed.data.assignmentId,
    requester_id: profileData.id,
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
    return { success: false, error: "Failed to create swap request" }
  }

  const swapRequestData = swapRequest as { id: string }

  // TODO: Send notification to target user or all eligible volunteers

  revalidatePath("/rota/swaps")
  revalidatePath("/rota/my-schedule")

  return { success: true, data: { id: swapRequestData.id } }
}

/**
 * Accept a swap request (target user)
 */
export async function acceptSwapRequest(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  // Get user's profile ID
  const { data: profileResult } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .single()

  if (!profileResult) {
    return { success: false, error: "Profile not found" }
  }

  const profile = profileResult as { id: string }

  // Get the swap request
  const { data: swapRequestData } = await supabase
    .from("swap_requests")
    .select("id, target_user_id, status")
    .eq("id", id)
    .single()

  if (!swapRequestData) {
    return { success: false, error: "Swap request not found" }
  }

  const swapRequest = swapRequestData as { id: string; target_user_id: string | null; status: string }

  if (swapRequest.status !== "pending") {
    return { success: false, error: "This request has already been processed" }
  }

  // For targeted requests, verify the current user is the target
  if (swapRequest.target_user_id && swapRequest.target_user_id !== profile.id) {
    return { success: false, error: "You are not authorized to accept this request" }
  }

  // Update the swap request status to accepted
  const updateData = { 
    status: "accepted" as const,
    target_user_id: profile.id, // Set target if it was an open request
  }

  const { error } = await supabase
    .from("swap_requests")
    .update(updateData as never)
    .eq("id", id)

  if (error) {
    console.error("Error accepting swap request:", error)
    return { success: false, error: "Failed to accept swap request" }
  }

  // TODO: Notify the requester and leaders

  revalidatePath("/rota/swaps")
  revalidatePath("/rota/my-schedule")

  return { success: true }
}

/**
 * Decline a swap request (target user)
 */
export async function declineSwapRequest(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  // Get user's profile ID
  const { data: profileResult } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .single()

  if (!profileResult) {
    return { success: false, error: "Profile not found" }
  }

  const profile = profileResult as { id: string }

  // Get the swap request
  const { data: swapRequestData } = await supabase
    .from("swap_requests")
    .select("id, target_user_id, status")
    .eq("id", id)
    .single()

  if (!swapRequestData) {
    return { success: false, error: "Swap request not found" }
  }

  const swapRequest = swapRequestData as { id: string; target_user_id: string | null; status: string }

  if (swapRequest.status !== "pending") {
    return { success: false, error: "This request has already been processed" }
  }

  // For targeted requests, verify the current user is the target
  if (swapRequest.target_user_id && swapRequest.target_user_id !== profile.id) {
    return { success: false, error: "You are not authorized to decline this request" }
  }

  // Update the swap request status to declined
  const updateData = { 
    status: "declined" as const,
    resolved_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from("swap_requests")
    .update(updateData as never)
    .eq("id", id)

  if (error) {
    console.error("Error declining swap request:", error)
    return { success: false, error: "Failed to decline swap request" }
  }

  // TODO: Notify the requester

  revalidatePath("/rota/swaps")
  revalidatePath("/rota/my-schedule")

  return { success: true }
}

/**
 * Approve a swap request (leader only)
 */
export async function approveSwapRequest(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  // Get user's profile and verify role
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single()

  if (!profile) {
    return { success: false, error: "Profile not found" }
  }

  const profileData = profile as { id: string; role: string }
  if (profileData.role !== "admin" && profileData.role !== "lead_developer" && profileData.role !== "leader") {
    return { success: false, error: "Only leaders can approve swap requests" }
  }

  // Get the swap request with assignment details
  const { data: swapRequestData } = await supabase
    .from("swap_requests")
    .select("id, status, target_user_id, original_assignment_id")
    .eq("id", id)
    .single()

  if (!swapRequestData) {
    return { success: false, error: "Swap request not found" }
  }

  const swapRequest = swapRequestData as { id: string; status: string; target_user_id: string | null; original_assignment_id: string }

  if (swapRequest.status !== "accepted") {
    return { success: false, error: "Can only approve requests that have been accepted" }
  }

  if (!swapRequest.target_user_id) {
    return { success: false, error: "No target user for this swap request" }
  }

  // Start a transaction-like operation
  // 1. Update the swap request status
  const approveData = { 
    status: "approved" as const,
    resolved_at: new Date().toISOString(),
  }

  const { error: swapError } = await supabase
    .from("swap_requests")
    .update(approveData as never)
    .eq("id", id)

  if (swapError) {
    console.error("Error approving swap request:", swapError)
    return { success: false, error: "Failed to approve swap request" }
  }

  // 2. Update the assignment to the new user
  const assignmentUpdate = { 
    user_id: swapRequest.target_user_id,
    status: "pending" as const, // Reset to pending so new assignee can confirm
    confirmed_at: null,
  }

  const { error: assignmentError } = await supabase
    .from("rota_assignments")
    .update(assignmentUpdate as never)
    .eq("id", swapRequest.original_assignment_id)

  if (assignmentError) {
    console.error("Error updating assignment:", assignmentError)
    // Try to rollback the swap request status
    const rollbackData = { status: "accepted" as const, resolved_at: null }
    await supabase
      .from("swap_requests")
      .update(rollbackData as never)
      .eq("id", id)
    return { success: false, error: "Failed to update assignment" }
  }

  // TODO: Notify both users about the approved swap

  revalidatePath("/rota")
  revalidatePath("/rota/swaps")
  revalidatePath("/rota/my-schedule")

  return { success: true }
}

/**
 * Reject a swap request (leader only)
 */
export async function rejectSwapRequest(id: string): Promise<ActionResult> {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  // Get user's profile and verify role
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single()

  if (!profile) {
    return { success: false, error: "Profile not found" }
  }

  const profileData = profile as { id: string; role: string }
  if (profileData.role !== "admin" && profileData.role !== "lead_developer" && profileData.role !== "leader") {
    return { success: false, error: "Only leaders can reject swap requests" }
  }

  // Get the swap request
  const { data: swapRequestData } = await supabase
    .from("swap_requests")
    .select("id, status")
    .eq("id", id)
    .single()

  if (!swapRequestData) {
    return { success: false, error: "Swap request not found" }
  }

  const swapRequest = swapRequestData as { id: string; status: string }

  if (swapRequest.status !== "accepted") {
    return { success: false, error: "Can only reject requests that have been accepted" }
  }

  // Update the swap request status to rejected
  const rejectData = { 
    status: "rejected" as const,
    resolved_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from("swap_requests")
    .update(rejectData as never)
    .eq("id", id)

  if (error) {
    console.error("Error rejecting swap request:", error)
    return { success: false, error: "Failed to reject swap request" }
  }

  // TODO: Notify both users about the rejected swap

  revalidatePath("/rota/swaps")
  revalidatePath("/rota/my-schedule")

  return { success: true }
}

/**
 * Get swap requests for the current user
 */
export async function getMySwapRequests(): Promise<ActionResult<{
  incoming: SwapRequestWithDetails[]
  outgoing: SwapRequestWithDetails[]
}>> {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  // Get user's profile ID
  const { data: profileResult } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .single()

  if (!profileResult) {
    return { success: false, error: "Profile not found" }
  }

  const profile = profileResult as { id: string }

  // Define the raw data type for swap request queries
  type SwapRequestRawData = {
    id: string
    status: string
    reason: string | null
    created_at: string
    resolved_at: string | null
    requester: { id: string; name: string; avatar_url: string | null } | null
    target_user: { id: string; name: string; avatar_url: string | null } | null
    original_assignment: {
      id: string
      rota: { date: string; service: { name: string } | null } | null
      position: { name: string; department: { name: string } | null } | null
    } | null
  }

  // Get incoming requests (where user is the target)
  const { data: incomingDataRaw, error: incomingError } = await supabase
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
    .eq("target_user_id", profile.id)
    .order("created_at", { ascending: false })

  if (incomingError) {
    console.error("Error fetching incoming swap requests:", incomingError)
    return { success: false, error: "Failed to fetch incoming requests" }
  }

  const incomingData = (incomingDataRaw || []) as SwapRequestRawData[]

  // Get outgoing requests (where user is the requester)
  const { data: outgoingDataRaw, error: outgoingError } = await supabase
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
    .eq("requester_id", profile.id)
    .order("created_at", { ascending: false })

  if (outgoingError) {
    console.error("Error fetching outgoing swap requests:", outgoingError)
    return { success: false, error: "Failed to fetch outgoing requests" }
  }

  const outgoingData = (outgoingDataRaw || []) as SwapRequestRawData[]

  // Transform data
  const transformData = (data: SwapRequestRawData[]) => {
    return data.map((item) => {
      return {
        id: item.id,
        status: item.status,
        reason: item.reason,
        createdAt: item.created_at,
        resolvedAt: item.resolved_at,
        requester: item.requester ? {
          id: item.requester.id,
          name: item.requester.name,
          avatarUrl: item.requester.avatar_url,
        } : null,
        targetUser: item.target_user ? {
          id: item.target_user.id,
          name: item.target_user.name,
          avatarUrl: item.target_user.avatar_url,
        } : null,
        assignment: {
          id: item.original_assignment?.id || "",
          date: item.original_assignment?.rota?.date || "",
          serviceName: item.original_assignment?.rota?.service?.name || "Unknown Service",
          positionName: item.original_assignment?.position?.name || "Unknown Position",
          departmentName: item.original_assignment?.position?.department?.name || "Unknown Department",
        },
      }
    })
  }

  return {
    success: true,
    data: {
      incoming: transformData(incomingData) as SwapRequestWithDetails[],
      outgoing: transformData(outgoingData) as SwapRequestWithDetails[],
    },
  }
}

/**
 * Get pending swap requests for leader approval
 */
export async function getPendingApprovals(): Promise<ActionResult<SwapRequestWithDetails[]>> {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  // Get user's profile and verify role
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single()

  if (!profile) {
    return { success: false, error: "Profile not found" }
  }

  const profileData = profile as { id: string; role: string }
  if (profileData.role !== "admin" && profileData.role !== "lead_developer" && profileData.role !== "leader") {
    return { success: false, error: "Only leaders can view pending approvals" }
  }

  // Get swap requests with "accepted" status (awaiting leader approval)
  const { data, error } = await supabase
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
    .eq("status", "accepted")
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Error fetching pending approvals:", error)
    return { success: false, error: "Failed to fetch pending approvals" }
  }

  // Define the raw data type
  type SwapRequestRawData = {
    id: string
    status: string
    reason: string | null
    created_at: string
    resolved_at: string | null
    requester: { id: string; name: string; avatar_url: string | null } | null
    target_user: { id: string; name: string; avatar_url: string | null } | null
    original_assignment: {
      id: string
      rota: { date: string; service: { name: string } | null } | null
      position: { name: string; department: { name: string } | null } | null
    } | null
  }

  const rawData = (data || []) as SwapRequestRawData[]

  // Transform data
  const transformedData = rawData.map((item) => {
    return {
      id: item.id,
      status: item.status,
      reason: item.reason,
      createdAt: item.created_at,
      resolvedAt: item.resolved_at,
      requester: item.requester ? {
        id: item.requester.id,
        name: item.requester.name,
        avatarUrl: item.requester.avatar_url,
      } : null,
      targetUser: item.target_user ? {
        id: item.target_user.id,
        name: item.target_user.name,
        avatarUrl: item.target_user.avatar_url,
      } : null,
      assignment: {
        id: item.original_assignment?.id || "",
        date: item.original_assignment?.rota?.date || "",
        serviceName: item.original_assignment?.rota?.service?.name || "Unknown Service",
        positionName: item.original_assignment?.position?.name || "Unknown Position",
        departmentName: item.original_assignment?.position?.department?.name || "Unknown Department",
      },
    }
  })

  return { success: true, data: transformedData as SwapRequestWithDetails[] }
}

// Type for the transformed swap request data
interface SwapRequestWithDetails {
  id: string
  status: string
  reason: string | null
  createdAt: string
  resolvedAt: string | null
  requester: {
    id: string
    name: string
    avatarUrl: string | null
  } | null
  targetUser: {
    id: string
    name: string
    avatarUrl: string | null
  } | null
  assignment: {
    id: string
    date: string
    serviceName: string
    positionName: string
    departmentName: string
  }
}
