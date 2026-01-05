import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  createDesignRequestSchema,
  designRequestQuerySchema,
} from "@/lib/validations/designs"
import { checkRateLimit } from "@/lib/rate-limit"

/**
 * POST /api/designs - Create a new design request (public, no auth)
 */
export async function POST(request: NextRequest) {
  // Rate limiting check
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
  const rateLimit = checkRateLimit(ip, 3, 3600000) // 3 requests per hour

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(rateLimit.resetIn / 1000)),
        },
      }
    )
  }

  try {
    const body = await request.json()

    // Validate input
    const parsed = createDesignRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    // Honeypot check - silently reject bots
    if (parsed.data.website && parsed.data.website.length > 0) {
      // Return fake success to fool bots
      return NextResponse.json(
        {
          id: "00000000-0000-0000-0000-000000000000",
          message: "Design request submitted successfully",
        },
        { status: 201 }
      )
    }

    // Use admin client to bypass RLS for public insert
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from("design_requests")
      .insert({
        title: parsed.data.title,
        description: parsed.data.description,
        request_type: parsed.data.type,
        priority: parsed.data.priority,
        requester_name: parsed.data.requesterName,
        requester_email: parsed.data.requesterEmail,
        requester_phone: parsed.data.requesterPhone || null,
        requester_ministry: parsed.data.requesterMinistry || null,
        needed_by: parsed.data.neededBy || null,
        reference_urls: parsed.data.referenceUrls || [],
      })
      .select("id")
      .single()

    if (error) {
      console.error("Design request insert error:", error)
      return NextResponse.json(
        { error: "Failed to submit design request" },
        { status: 500 }
      )
    }

    // TODO: Queue notification to all team members
    // This would integrate with the notification service to email
    // all users with appropriate roles about the new request

    return NextResponse.json(
      {
        id: data.id,
        message: "Design request submitted successfully",
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Unexpected error in POST /api/designs:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/designs - List design requests (authenticated)
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())

    // Validate query parameters
    const parsed = designRequestQuerySchema.safeParse(queryParams)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const {
      status,
      priority,
      assignedTo,
      search,
      includeArchived,
      limit,
      offset,
    } = parsed.data

    // Build query
    let query = supabase
      .from("design_requests")
      .select(
        `
        id,
        title,
        request_type,
        priority,
        status,
        requester_name,
        requester_email,
        needed_by,
        assigned_to,
        is_archived,
        created_at,
        assignee:profiles!design_requests_assigned_to_fkey(id, name)
      `,
        { count: "exact" }
      )

    // Filter by status
    if (status) {
      const statuses = status.split(",") as Array<
        "pending" | "in_progress" | "completed" | "cancelled" | "review" | "revision_requested"
      >
      query = query.in("status", statuses)
    }

    // Filter by priority
    if (priority) {
      query = query.eq("priority", priority as "low" | "medium" | "high" | "urgent")
    }

    // Filter by assignee
    if (assignedTo) {
      query = query.eq("assigned_to", assignedTo)
    }

    // Filter archived
    if (!includeArchived) {
      query = query.eq("is_archived", false)
    }

    // Search in title and requester name
    if (search) {
      query = query.or(
        `title.ilike.%${search}%,requester_name.ilike.%${search}%`
      )
    }

    // Pagination
    query = query.range(offset, offset + limit - 1)

    // Order by created date (newest first)
    query = query.order("created_at", { ascending: false })

    const { data, error, count } = await query

    if (error) {
      console.error("Design requests query error:", error)
      return NextResponse.json(
        { error: "Failed to fetch design requests" },
        { status: 500 }
      )
    }

    // Transform data to match expected format
    const transformedData = (data || []).map((request: any) => ({
      id: request.id,
      title: request.title,
      type: request.request_type,
      priority: request.priority,
      status: request.status,
      requesterName: request.requester_name,
      requesterEmail: request.requester_email,
      neededBy: request.needed_by,
      assignee: request.assignee
        ? {
            id: request.assignee.id,
            name: request.assignee.name,
          }
        : null,
      createdAt: request.created_at,
      isArchived: request.is_archived,
    }))

    return NextResponse.json(
      {
        data: transformedData,
        total: count || 0,
        hasMore: count ? offset + limit < count : false,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Unexpected error in GET /api/designs:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
