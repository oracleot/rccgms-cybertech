/**
 * GET /api/livestream/history
 * 
 * Get history of generated descriptions.
 */

import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      )
    }

    // Get user profile to check role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("auth_user_id", user.id)
      .single()

    const profileRole = (profile as { role: string } | null)?.role
    if (!profileRole || !["admin", "leader"].includes(profileRole)) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Leader or Admin access required" },
        { status: 403 }
      )
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100)
    const offset = parseInt(searchParams.get("offset") || "0")
    const platform = searchParams.get("platform")

    // Build query
    let query = supabase
      .from("livestreams")
      .select(`
        id,
        title,
        speaker,
        youtube_description,
        facebook_description,
        created_at,
        rota:rotas(id, date)
      `, { count: "exact" })
      .order("created_at", { ascending: false })

    // Platform filter
    if (platform === "youtube") {
      query = query.not("youtube_description", "is", null)
    } else if (platform === "facebook") {
      query = query.not("facebook_description", "is", null)
    }

    // Pagination
    query = query.range(offset, offset + limit - 1)

    const { data: livestreams, count, error } = await query

    if (error) {
      console.error("Error fetching history:", error)
      return NextResponse.json(
        { error: "DATABASE_ERROR", message: "Failed to fetch history" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      livestreams: livestreams || [],
      total: count || 0,
      hasMore: (count || 0) > offset + limit,
    })
  } catch (error) {
    console.error("Error in history endpoint:", error)
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
