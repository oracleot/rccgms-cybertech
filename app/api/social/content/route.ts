/**
 * Social Content API
 * POST - Create new social content
 * GET - List social content
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createContentSchema } from "@/lib/validations/social"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check user role
    const profileQuery = await supabase
      .from("profiles")
      .select("id, role")
      .eq("auth_user_id", user.id)
      .single()

    const profile = profileQuery.data as { id: string; role: string } | null

    if (!profile || profile.role === "volunteer") {
      return NextResponse.json(
        { error: "Only leaders and admins can create social content" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = createContentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { content, mediaUrls, platforms, scheduledFor } = parsed.data

    // Determine status based on scheduledFor
    const status = scheduledFor ? "scheduled" : "draft"

    const adminClient = createAdminClient()
    const { data: post, error } = await adminClient
      .from("social_posts")
      .insert({
        content,
        media_urls: mediaUrls || [],
        platforms: platforms,
        scheduled_for: scheduledFor || null,
        status,
        created_by: profile.id,
      } as Record<string, unknown>)
      .select()
      .single()

    if (error) {
      console.error("Create post error:", error)
      return NextResponse.json(
        { error: "Failed to create social content" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, content: post }, { status: 201 })
  } catch (error) {
    console.error("Social content POST error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get query params
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get("status")
    const platform = searchParams.get("platform")
    const from = searchParams.get("from")
    const to = searchParams.get("to")
    const limit = parseInt(searchParams.get("limit") || "50", 10)
    const offset = parseInt(searchParams.get("offset") || "0", 10)

    let query = supabase
      .from("social_posts")
      .select(
        `
        *,
        created_by:profiles!social_posts_created_by_fkey(id, name, avatar_url)
      `
      )
      .order("scheduled_for", { ascending: true, nullsFirst: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq("status", status)
    }

    if (platform) {
      query = query.contains("platforms", [platform])
    }

    // Date range filtering for calendar view
    if (from) {
      query = query.gte("scheduled_for", from)
    }

    if (to) {
      query = query.lte("scheduled_for", to)
    }

    const { data: posts, error } = await query

    if (error) {
      console.error("List posts error:", error)
      return NextResponse.json(
        { error: "Failed to list social content" },
        { status: 500 }
      )
    }

    return NextResponse.json({ posts })
  } catch (error) {
    console.error("Social content GET error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
