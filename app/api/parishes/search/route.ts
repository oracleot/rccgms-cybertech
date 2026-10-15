import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"

/**
 * GET /api/parishes/search?org=<orgId>&q=...
 *
 * Public search for active parishes within an organisation during signup.
 * Returns id, name, spiritual_expression, locality only — no sensitive data.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const orgId = searchParams.get("org")
  const q = searchParams.get("q")?.trim() ?? ""

  if (!orgId) {
    return NextResponse.json({ error: "Organisation ID required" }, { status: 400 })
  }

  const admin = createAdminClient()

  let query = admin
    .from("parishes")
    .select("id, name, spiritual_expression, locality, region")
    .eq("organisation_id", orgId)
    .eq("status", "active")
    .order("name")
    .limit(20)

  if (q.length > 0) {
    query = query.or(`name.ilike.%${q}%,spiritual_expression.ilike.%${q}%,locality.ilike.%${q}%`)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }

  return NextResponse.json({ parishes: data ?? [] })
}
