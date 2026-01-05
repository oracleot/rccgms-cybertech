import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Cron endpoint to auto-archive completed design requests
 * 
 * This should be called daily by Vercel Cron or an external scheduler.
 * It archives completed requests that are older than 12 months.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  try {
    console.log("[Cron] Starting design request auto-archive job")

    const supabase = createAdminClient()

    // Calculate the date 12 months ago
    const archiveThreshold = new Date()
    archiveThreshold.setMonth(archiveThreshold.getMonth() - 12)
    const thresholdDate = archiveThreshold.toISOString()

    // Find completed requests older than 12 months that aren't already archived
    const { data: requestsToArchive, error: fetchError } = await supabase
      .from("design_requests")
      .select("id")
      .eq("status", "completed")
      .eq("is_archived", false)
      .lt("completed_at", thresholdDate)

    if (fetchError) {
      console.error("[Cron] Error fetching requests to archive:", fetchError)
      return NextResponse.json(
        { error: "Failed to fetch requests" },
        { status: 500 }
      )
    }

    if (!requestsToArchive || requestsToArchive.length === 0) {
      console.log("[Cron] No design requests to archive")
      return NextResponse.json({
        success: true,
        archived: 0,
        timestamp: new Date().toISOString(),
      })
    }

    const idsToArchive = requestsToArchive.map((r) => r.id)

    // Archive the requests
    const { error: updateError, count } = await supabase
      .from("design_requests")
      .update({ 
        is_archived: true,
        archived_at: new Date().toISOString(),
      })
      .in("id", idsToArchive)

    if (updateError) {
      console.error("[Cron] Error archiving requests:", updateError)
      return NextResponse.json(
        { error: "Failed to archive requests" },
        { status: 500 }
      )
    }

    console.log(`[Cron] Archived ${count || idsToArchive.length} design requests`)

    return NextResponse.json({
      success: true,
      archived: count || idsToArchive.length,
      archivedIds: idsToArchive,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[Cron] Error in design auto-archive job:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
