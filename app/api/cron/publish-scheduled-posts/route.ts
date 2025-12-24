/**
 * Cron Job: Publish Scheduled Social Posts
 * 
 * Runs once daily at 9:00 AM to check for posts scheduled for that day.
 * 
 * Note: On Vercel Hobby plan, cron jobs are limited to:
 * - 2 cron jobs maximum
 * - Once per day execution only
 * 
 * For more frequent publishing (e.g., every 5 minutes), upgrade to Pro plan.
 * 
 * Actual publishing to social platforms would require additional
 * platform-specific APIs (Facebook Graph API, Twitter API, etc.)
 * For now, this marks posts as published and creates notifications.
 */

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest) {
  try {
    // Verify the request is from Vercel Cron (in production)
    const authHeader = request.headers.get("authorization")
    if (
      process.env.NODE_ENV === "production" &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createAdminClient()
    const now = new Date().toISOString()

    // Find all scheduled posts that should be published (scheduled_for <= now)
    const { data: postsToPublish, error: fetchError } = await supabase
      .from("social_posts")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_for", now)
      .order("scheduled_for", { ascending: true })

    if (fetchError) {
      console.error("[Cron] Error fetching scheduled posts:", fetchError)
      return NextResponse.json(
        { error: "Failed to fetch scheduled posts" },
        { status: 500 }
      )
    }

    if (!postsToPublish || postsToPublish.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No posts to publish",
        published: 0,
        timestamp: new Date().toISOString(),
      })
    }

    console.log(`[Cron] Found ${postsToPublish.length} posts to publish`)

    const results = {
      published: 0,
      failed: 0,
      errors: [] as string[],
    }

    for (const post of postsToPublish) {
      try {
        // In a real implementation, you would:
        // 1. For each platform in post.platforms, call the respective API
        // 2. Upload media from post.media_urls to the platform
        // 3. Post the content with the uploaded media
        // 4. Store the platform-specific post IDs for tracking

        // For now, we just mark the post as published
        // This is a placeholder for actual platform integration
        const { error: updateError } = await supabase
          .from("social_posts")
          .update({
            status: "published",
            published_at: now,
          })
          .eq("id", post.id)

        if (updateError) {
          throw updateError
        }

        results.published++

        // Log the publication
        console.log(
          `[Cron] Published post ${post.id} to platforms: ${post.platforms.join(", ")}`
        )

        // Create a notification for the creator
        await supabase.from("notifications").insert({
          profile_id: post.created_by,
          type: "social_post",
          title: "Post Published",
          message: `Your social media post has been published to ${post.platforms.join(", ")}`,
          data: { postId: post.id },
        })
      } catch (error) {
        console.error(`[Cron] Failed to publish post ${post.id}:`, error)
        results.failed++
        results.errors.push(
          `Post ${post.id}: ${error instanceof Error ? error.message : "Unknown error"}`
        )

        // Mark as failed
        await supabase
          .from("social_posts")
          .update({ status: "failed" })
          .eq("id", post.id)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${postsToPublish.length} posts`,
      ...results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[Cron] Publish scheduled posts error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
