import { NextRequest, NextResponse } from "next/server"
import { sendRotaReminders } from "@/lib/notifications/rota-notifications"
import { processPendingNotifications } from "@/lib/notifications/notification-service"
import { createAdminClient } from "@/lib/supabase/admin"

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

    // 2. Send design deadline reminders (before processing pending so they get sent this run)
    console.log("[Cron] Checking design deadlines...")
    const deadlineResult = await sendDesignDeadlineReminders()
    console.log(
      `[Cron] Design deadlines: ${deadlineResult.checked} checked, ${deadlineResult.reminded} reminders sent`
    )

    // 3. Send duty reminders
    console.log("[Cron] Sending duty reminders...")
    const reminderResult = await sendRotaReminders()
    console.log(
      `[Cron] Duty reminders: ${reminderResult.sent.email} emails, ${reminderResult.sent.sms} SMS, ${reminderResult.failed} failed`
    )

    // 4. Process pending notifications (including newly created deadline reminders)
    console.log("[Cron] Processing pending notifications...")
    const pendingResult2 = await processPendingNotifications()
    console.log(
      `[Cron] Second pass: ${pendingResult2.processed} processed, ${pendingResult2.sent} sent, ${pendingResult2.failed} failed`
    )

    return NextResponse.json({
      success: true,
      pendingNotifications: {
        processed: pendingResult.processed + pendingResult2.processed,
        sent: pendingResult.sent + pendingResult2.sent,
        failed: pendingResult.failed + pendingResult2.failed,
      },
      dutyReminders: {
        sent: reminderResult.sent,
        failed: reminderResult.failed,
      },
      designDeadlines: {
        checked: deadlineResult.checked,
        reminded: deadlineResult.reminded,
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

/**
 * Check design request deadlines and send reminders at key thresholds:
 * - "due_soon": less than 24 hours remaining
 * - "overdue": past the deadline
 */
async function sendDesignDeadlineReminders() {
  const supabase = createAdminClient()
  const now = new Date()

  // Get all design requests with deadlines that are not completed/cancelled
  const { data: requests, error } = await supabase
    .from("design_requests")
    .select(`
      id, title, deadline, reminders_sent, assigned_to,
      assignee:profiles!design_requests_assigned_to_fkey(name, email)
    `)
    .not("deadline", "is", null)
    .not("status", "in", '("completed","cancelled")')
    .not("assigned_to", "is", null)

  if (error || !requests) {
    console.error("[Cron] Error fetching design deadlines:", error)
    return { checked: 0, reminded: 0 }
  }

  let reminded = 0

  for (const request of requests) {
    const deadline = new Date(request.deadline!)
    const hoursRemaining = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60)
    const sentReminders: string[] = Array.isArray(request.reminders_sent)
      ? (request.reminders_sent as string[])
      : []

    let reminderType: string | null = null

    if (hoursRemaining < 0 && !sentReminders.includes("overdue")) {
      reminderType = "overdue"
    } else if (hoursRemaining > 0 && hoursRemaining <= 24 && !sentReminders.includes("due_soon")) {
      reminderType = "due_soon"
    }

    if (!reminderType) continue

    const assignee = request.assignee as unknown as { name: string; email: string } | null
    if (!assignee?.email) continue

    // Log reminder to notifications table
    try {
      await supabase.from("notifications").insert({
        type: "design_deadline",
        recipient_id: request.assigned_to,
        title: reminderType === "overdue"
          ? `Design request "${request.title}" is overdue`
          : `Design request "${request.title}" is due within 24 hours`,
        body: reminderType === "overdue"
          ? `The deadline has passed. Please update the status or provide a delay reason.`
          : `The deadline is ${deadline.toLocaleDateString()}. Please ensure it's on track.`,
        channel: "email",
        status: "pending",
      })

      // Update reminders_sent to avoid duplicate sends
      const updatedReminders = [...sentReminders, reminderType]
      await supabase
        .from("design_requests")
        .update({ reminders_sent: updatedReminders })
        .eq("id", request.id)

      reminded++
    } catch (err) {
      console.error(`[Cron] Failed to send deadline reminder for ${request.id}:`, err)
    }
  }

  return { checked: requests.length, reminded }
}

// Also support POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request)
}
