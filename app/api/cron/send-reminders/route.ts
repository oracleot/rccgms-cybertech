import { NextRequest, NextResponse } from "next/server"
import { sendRotaReminders } from "@/lib/notifications/rota-notifications"
import { processPendingNotifications } from "@/lib/notifications/notification-service"

/**
 * Cron endpoint to send duty reminders and process pending notifications
 * 
 * This should be called daily by Vercel Cron or an external scheduler.
 * It sends reminders to members who have upcoming service assignments,
 * and also processes any queued notifications.
 * 
 * Expected to be called at ~8:00 AM local time daily.
 * 
 * Note: On Vercel Hobby plan, cron jobs are limited to:
 * - 2 cron jobs maximum
 * - Once per day execution only
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
    console.log("[Cron] Starting daily notifications job")

    // 1. Process any pending queued notifications first
    console.log("[Cron] Processing pending notifications...")
    const pendingResult = await processPendingNotifications()
    console.log(
      `[Cron] Pending notifications: ${pendingResult.processed} processed, ${pendingResult.sent} sent, ${pendingResult.failed} failed`
    )

    // 2. Send duty reminders
    console.log("[Cron] Sending duty reminders...")
    const reminderResult = await sendRotaReminders()
    console.log(
      `[Cron] Duty reminders: ${reminderResult.sent.email} emails, ${reminderResult.sent.sms} SMS, ${reminderResult.failed} failed`
    )

    return NextResponse.json({
      success: true,
      pendingNotifications: {
        processed: pendingResult.processed,
        sent: pendingResult.sent,
        failed: pendingResult.failed,
      },
      dutyReminders: {
        sent: reminderResult.sent,
        failed: reminderResult.failed,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[Cron] Error in daily notifications job:", error)
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
