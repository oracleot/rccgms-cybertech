import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * GET /api/admin/developer/tables/[table]/rows
 * Browse rows in a specific table with pagination, search, and sorting
 * Access: admin, lead_developer, developer
 *
 * Query params:
 *   page (default: 1)
 *   pageSize (default: 25, max: 100)
 *   sort (column name)
 *   order (asc | desc, default: asc)
 *   search (text to search across text columns)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> }
) {
  try {
    const { table } = await params
    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("auth_user_id", user.id)
      .single()

    if (!profile || !["admin", "lead_developer", "developer"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Allowlist of tables that can be browsed
    const allowedTables = [
      "profiles", "departments", "positions", "user_departments",
      "services", "rotas", "rota_assignments", "availability",
      "swap_requests", "equipment_categories", "equipment",
      "equipment_checkouts", "equipment_maintenance",
      "rundowns", "rundown_items",
      "onboarding_tracks", "onboarding_steps", "volunteer_progress", "step_completions",
      "notifications", "notification_preferences",
      "social_posts", "social_integrations",
      "livestream_templates", "livestream_history",
      "design_requests",
    ]

    if (!allowedTables.includes(table)) {
      return NextResponse.json({ error: `Table '${table}' is not accessible` }, { status: 400 })
    }

    // Parse query params
    const url = new URL(request.url)
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"))
    const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "25")))
    const sort = url.searchParams.get("sort") ?? "created_at"
    const order = url.searchParams.get("order") === "desc" ? false : true // ascending default
    const search = url.searchParams.get("search") ?? ""

    const adminClient = createAdminClient()

    // Get total count
    const { count: totalCount, error: countError } = await adminClient
      .from(table)
      .select("*", { count: "exact", head: true })

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 })
    }

    // Build query
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = adminClient
      .from(table)
      .select("*")
      .range(from, to)

    // Try to sort by the requested column, fallback to no sort
    try {
      query = query.order(sort, { ascending: order })
    } catch {
      // Column might not exist, use default ordering
    }

    // Apply text search if provided
    if (search) {
      // Use ilike on common text columns
      const textColumns = ["name", "title", "description", "email", "status", "type"]
      const orFilters = textColumns.map((col) => `${col}.ilike.%${search}%`).join(",")
      query = query.or(orFilters)
    }

    const { data: rows, error: rowsError } = await query

    if (rowsError) {
      // If sort/search column doesn't exist, retry without them
      const fallbackQuery = adminClient
        .from(table)
        .select("*")
        .range(from, to)

      const { data: fallbackRows, error: fallbackError } = await fallbackQuery

      if (fallbackError) {
        return NextResponse.json({ error: fallbackError.message }, { status: 500 })
      }

      return NextResponse.json({
        table,
        rows: fallbackRows ?? [],
        pagination: {
          page,
          pageSize,
          totalRows: totalCount ?? 0,
          totalPages: Math.ceil((totalCount ?? 0) / pageSize),
        },
        sort: null,
        search: null,
      })
    }

    return NextResponse.json({
      table,
      rows: rows ?? [],
      pagination: {
        page,
        pageSize,
        totalRows: totalCount ?? 0,
        totalPages: Math.ceil((totalCount ?? 0) / pageSize),
      },
      sort: { column: sort, ascending: order },
      search: search || null,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
