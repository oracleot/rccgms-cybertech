import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"

/**
 * GET /api/organisations/search?q=...
 *
 * Public search for active organisations during signup.
 * Returns id, name, short_name only — no sensitive data.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")?.trim() ?? ""

  const admin = createAdminClient()

  let query = admin
    .from("organisations")
    .select("id, name, short_name")
    .eq("status", "active")
    .order("name")
    .limit(20)

  if (q.length > 0) {
    query = query.or(`name.ilike.%${q}%,short_name.ilike.%${q}%`)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }

  return NextResponse.json({ organisations: data ?? [] })
}
