/**
 * Social Content by ID API
 * GET - Get single content
 * PATCH - Update content
 * DELETE - Delete content
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { updateContentSchema } from "@/lib/validations/social"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: post, error } = await supabase
      .from("social_posts")
      .select(
        `
        *,
        created_by:profiles!social_posts_created_by_fkey(id, name, avatar_url)
      `
      )
      .eq("id", id)
      .single()

    if (error || !post) {
      return NextResponse.json(
        { error: "Content not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ content: post })
  } catch (error) {
    console.error("Social content GET error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get profile and check role
    const profileQuery = await supabase
      .from("profiles")
      .select("id, role")
      .eq("auth_user_id", user.id)
      .single()

    const profile = profileQuery.data as { id: string; role: string } | null

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // Get existing post
    const postQuery = await supabase
      .from("social_posts")
      .select("created_by")
      .eq("id", id)
      .single()

    const existingPost = postQuery.data as { created_by: string } | null

    if (!existingPost) {
      return NextResponse.json(
        { error: "Content not found" },
        { status: 404 }
      )
    }

    // Only creator or admin can update
    if (existingPost.created_by !== profile.id && profile.role !== "admin" && profile.role !== "lead_developer") {
      return NextResponse.json(
        { error: "You can only update your own content" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = updateContentSchema.safeParse({ ...body, id })

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { content, mediaUrls, platforms, scheduledFor, status } = parsed.data

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (content !== undefined) updateData.content = content
    if (mediaUrls !== undefined) updateData.media_urls = mediaUrls
    if (platforms !== undefined) updateData.platforms = platforms
    if (scheduledFor !== undefined) updateData.scheduled_for = scheduledFor
    if (status !== undefined) updateData.status = status

    const adminClient = createAdminClient()
    const { data: post, error } = await adminClient
      .from("social_posts")
      .update(updateData as Record<string, unknown>)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Update post error:", error)
      return NextResponse.json(
        { error: "Failed to update content" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, content: post })
  } catch (error) {
    console.error("Social content PATCH error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get profile and check role
    const deleteProfileQuery = await supabase
      .from("profiles")
      .select("id, role")
      .eq("auth_user_id", user.id)
      .single()

    const profile = deleteProfileQuery.data as { id: string; role: string } | null

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // Get existing post
    const deletePostQuery = await supabase
      .from("social_posts")
      .select("created_by")
      .eq("id", id)
      .single()

    const existingPost = deletePostQuery.data as { created_by: string } | null

    if (!existingPost) {
      return NextResponse.json(
        { error: "Content not found" },
        { status: 404 }
      )
    }

    // Only creator or admin can delete
    if (existingPost.created_by !== profile.id && profile.role !== "admin" && profile.role !== "lead_developer") {
      return NextResponse.json(
        { error: "You can only delete your own content" },
        { status: 403 }
      )
    }

    const adminClient = createAdminClient()
    const { error } = await adminClient.from("social_posts").delete().eq("id", id)

    if (error) {
      console.error("Delete post error:", error)
      return NextResponse.json(
        { error: "Failed to delete content" },
        { status: 500 }
      )
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error("Social content DELETE error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
