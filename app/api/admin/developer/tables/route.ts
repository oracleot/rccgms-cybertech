import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * GET /api/admin/developer/tables
 * Lists all public tables with row counts and column info
 * Access: admin, lead_developer, developer
 */
export async function GET() {
  try {
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

    const adminClient = createAdminClient()

    // Get all tables from information_schema
    const { data: tables, error: tablesError } = await adminClient
      .rpc("get_table_info")

    if (tablesError) {
      // Fallback: query information_schema directly via raw SQL
      const { data: _rawTables, error: rawError } = await adminClient
        .from("profiles")
        .select("id")
        .limit(0)

      if (rawError) {
        return NextResponse.json({ error: "Failed to query database" }, { status: 500 })
      }

      // Return a basic list of known tables with counts
      const knownTables = [
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

      const tableData = await Promise.all(
        knownTables.map(async (tableName) => {
          const { count, error } = await adminClient
            .from(tableName)
            .select("*", { count: "exact", head: true })

          return {
            name: tableName,
            row_count: error ? -1 : (count ?? 0),
            error: error?.message || null,
          }
        })
      )

      // Filter out tables that errored (don't exist)
      const validTables = tableData.filter((t) => t.row_count >= 0)

      return NextResponse.json({ tables: validTables })
    }

    return NextResponse.json({ tables })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
