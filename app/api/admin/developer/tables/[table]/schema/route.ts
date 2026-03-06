import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * GET /api/admin/developer/tables/[table]/schema
 * Returns column definitions for a specific table
 * Access: admin, lead_developer, developer
 */
export async function GET(
  _request: NextRequest,
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

    // Allowlist
    const allowedTables = [
      "profiles", "departments", "positions", "user_departments",
      "services", "rotas", "rota_assignments", "availability",
      "swap_requests", "equipment_categories", "equipment",
      "equipment_checkouts", "equipment_maintenance",
      "rundowns", "rundown_items",
      "onboarding_tracks", "onboarding_steps", "member_progress", "step_completions",
      "notifications", "notification_preferences",
      "social_posts", "social_integrations",
      "livestream_templates", "livestream_history",
      "design_requests",
    ]

    if (!allowedTables.includes(table)) {
      return NextResponse.json({ error: `Table '${table}' is not accessible` }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // Query information_schema for column details
    const { data: columns, error: colError } = await adminClient
      .rpc("get_columns_for_table", { target_table: table })

    if (colError) {
      // Fallback: try querying one row and infer columns from keys
      const { data: sampleRow, error: sampleError } = await adminClient
        .from(table)
        .select("*")
        .limit(1)
        .single()

      if (sampleError && sampleError.code !== "PGRST116") {
        return NextResponse.json({ error: sampleError.message }, { status: 500 })
      }

      // Infer columns from keys
      const inferredColumns = sampleRow
        ? Object.keys(sampleRow).map((key) => ({
            column_name: key,
            data_type: typeof (sampleRow as Record<string, unknown>)[key] === "number" ? "numeric" 
              : typeof (sampleRow as Record<string, unknown>)[key] === "boolean" ? "boolean"
              : "text",
            is_nullable: "YES",
            column_default: null,
            is_primary: key === "id",
          }))
        : []

      return NextResponse.json({
        table,
        columns: inferredColumns,
        source: "inferred",
      })
    }

    return NextResponse.json({
      table,
      columns,
      source: "information_schema",
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
