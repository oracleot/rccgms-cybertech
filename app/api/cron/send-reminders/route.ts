import { NextRequest, NextResponse } from "next/server"
import { sendRotaReminders } from "@/lib/notifications/rota-notifications"

/**
 * Cron endpoint to send duty reminders
 * 
 * This should be called daily by Vercel Cron or an external scheduler.
 * It sends reminders to volunteers who have upcoming service assignments.
 * 
 * Expected to be called at ~8:00 AM local time daily.
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
    console.log("[Cron] Starting duty reminder job")

    const result = await sendRotaReminders()

    console.log(
      `[Cron] Duty reminders complete: ${result.sent.email} emails, ${result.sent.sms} SMS, ${result.failed} failed`
    )

    return NextResponse.json({
      success: true,
      sent: result.sent,
      failed: result.failed,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[Cron] Error in duty reminder job:", error)
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
