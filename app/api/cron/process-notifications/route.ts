import { NextRequest, NextResponse } from "next/server"
import { processPendingNotifications } from "@/lib/notifications/notification-service"

/**
 * Cron endpoint to process pending notifications
 * 
 * This should be called every 5-15 minutes by Vercel Cron or an external scheduler.
 * It processes queued notifications (email/SMS) that are waiting to be sent.
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
    console.log("[Cron] Starting notification processing job")

    const result = await processPendingNotifications()

    console.log(
      `[Cron] Notifications processed: ${result.processed} total, ${result.sent} sent, ${result.failed} failed`
    )

    return NextResponse.json({
      success: true,
      processed: result.processed,
      sent: result.sent,
      failed: result.failed,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[Cron] Error in notification processing job:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

// Also support POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request)
}
