import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * POST /api/admin/developer/query
 * Execute a read-only SQL query (SELECT only)
 * Access: admin, lead_developer, developer
 *
 * Body: { sql: string }
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const sql = (body.sql ?? "").trim()

    if (!sql) {
      return NextResponse.json({ error: "SQL query is required" }, { status: 400 })
    }

    // Safety: only allow SELECT statements
    const normalised = sql.toLowerCase().replace(/\s+/g, " ").trim()

    // Block dangerous keywords
    const blockedKeywords = [
      "insert", "update", "delete", "drop", "alter", "create",
      "truncate", "grant", "revoke", "copy", "exec", "execute",
      "set ", "do ", "call ", "perform",
    ]

    // Check if starts with SELECT, WITH, or EXPLAIN
    const allowedStarts = ["select", "with", "explain"]
    const startsAllowed = allowedStarts.some((kw) => normalised.startsWith(kw))
    if (!startsAllowed) {
      return NextResponse.json(
        { error: "Only SELECT, WITH, and EXPLAIN queries are allowed" },
        { status: 400 }
      )
    }

    // Check for blocked keywords that could indicate write operations
    // Be careful to avoid false positives (e.g., "select * from deleted_items")
    for (const keyword of blockedKeywords) {
      // Check if the keyword appears as a statement start (after semicolons or at start)
      const pattern = new RegExp(`(^|;)\\s*${keyword}`, "i")
      if (pattern.test(normalised)) {
        return NextResponse.json(
          { error: `Blocked keyword detected: ${keyword.trim()}. Only read queries allowed.` },
          { status: 400 }
        )
      }
    }

    // Block multiple statements (semicolon followed by anything meaningful)
    if (/;\s*\w/.test(normalised)) {
      return NextResponse.json(
        { error: "Multiple statements are not allowed" },
        { status: 400 }
      )
    }

    // Limit result size
    const hasLimit = /\blimit\b/i.test(normalised)
    const queryToRun = hasLimit ? sql : `${sql.replace(/;\s*$/, "")} LIMIT 500`

    const adminClient = createAdminClient()

    const startTime = Date.now()
    const { data, error } = await adminClient.rpc("run_readonly_query", {
      query_text: queryToRun,
    })
    const duration = Date.now() - startTime

    if (error) {
      // Fallback: if the RPC function doesn't exist, return a helpful message
      if (error.code === "PGRST202" || error.message.includes("function")) {
        return NextResponse.json({
          error: "SQL query execution requires the run_readonly_query database function. See the setup instructions.",
          hint: "Create the function using the migration provided in the developer tools setup.",
          duration,
        }, { status: 501 })
      }

      return NextResponse.json({
        error: error.message,
        hint: error.hint || null,
        duration,
      }, { status: 400 })
    }

    return NextResponse.json({
      rows: data ?? [],
      rowCount: Array.isArray(data) ? data.length : 0,
      duration,
      query: sql,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
