/**
 * Notification Service
 * 
 * Central service for sending notifications via email/SMS
 * with failure logging and retry support
 */

import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail } from "./email"
import { sendSMS, isSMSConfigured } from "./sms"
import type { NotificationType } from "@/types/notification"

const MAX_RETRY_ATTEMPTS = (() => {
  const raw = process.env.NOTIFICATION_MAX_RETRY_ATTEMPTS
  if (!raw) return 3
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3
})()

export interface NotificationPayload {
  userId: string
  type: NotificationType
  title: string
  body: string
  data?: Record<string, unknown>
  channels?: ("email" | "sms")[]
}

export interface SendResult {
  success: boolean
  channel: "email" | "sms"
  messageId?: string
  error?: string
}

interface NotificationRecord {
  id: string
  user_id: string
  type: string
  channel: string
  title: string
  body: string
  retry_count: number
}

interface UserRecord {
  email: string
  phone: string | null
}

interface NotificationWithUser extends NotificationRecord {
  user: UserRecord | null
}

interface NotificationPreferenceRecord {
  email_enabled: boolean
  sms_enabled: boolean
}

/**
 * Queue a notification for sending
 * Creates a pending notification record that will be processed by the cron job
 */
export async function queueNotification(
  payload: NotificationPayload
): Promise<{ queued: boolean; notificationIds: string[] }> {
  const supabase = createAdminClient()
  const notificationIds: string[] = []

  // Default to email if no channels specified
  const channels = payload.channels || ["email"]

  for (const channel of channels) {
    const { data, error } = await supabase
      .from("notifications")
      .insert({
        user_id: payload.userId,
        type: payload.type,
        channel,
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
        status: "pending",
      } as Record<string, unknown>)
      .select("id")
      .single()

    if (error) {
      console.error(`Failed to queue ${channel} notification:`, error)
    } else if (data) {
      const record = data as { id: string }
      notificationIds.push(record.id)
    }
  }

  return { queued: notificationIds.length > 0, notificationIds }
}

/**
 * Send a notification immediately (bypasses queue)
 * Use for time-sensitive notifications
 */
export async function sendNotificationNow(
  payload: NotificationPayload
): Promise<SendResult[]> {
  const supabase = createAdminClient()
  const results: SendResult[] = []

  // Get user's email and phone
  const { data: userData } = await supabase
    .from("profiles")
    .select("email, phone")
    .eq("id", payload.userId)
    .single()

  const user = userData as UserRecord | null

  if (!user) {
    return [{ success: false, channel: "email", error: "User not found" }]
  }

  const channels = payload.channels || ["email"]

  for (const channel of channels) {
    // Create notification record
    const { data: notificationData, error: insertError } = await supabase
      .from("notifications")
      .insert({
        user_id: payload.userId,
        type: payload.type,
        channel,
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
        status: "pending",
      } as Record<string, unknown>)
      .select("id")
      .single()

    const notification = notificationData as { id: string } | null

    if (insertError || !notification) {
      results.push({ success: false, channel, error: "Failed to create notification record" })
      continue
    }

    // Send based on channel
    let sendResult: { success: boolean; messageId?: string; error?: string }

    if (channel === "email") {
      sendResult = await sendEmail({
        to: user.email,
        subject: payload.title,
        html: `<p>${payload.body.replace(/\n/g, "<br>")}</p>`,
        text: payload.body,
      })
    } else if (channel === "sms") {
      if (!user.phone) {
        sendResult = { success: false, error: "No phone number" }
      } else if (!isSMSConfigured()) {
        sendResult = { success: false, error: "SMS not configured" }
      } else {
        sendResult = await sendSMS({
          to: user.phone,
          text: payload.body,
        })
      }
    } else {
      sendResult = { success: false, error: "Unknown channel" }
    }

    // Update notification record
    await supabase
      .from("notifications")
      .update({
        status: sendResult.success ? "sent" : "failed",
        error_message: sendResult.error || null,
        sent_at: sendResult.success ? new Date().toISOString() : null,
      } as Record<string, unknown>)
      .eq("id", notification.id)

    results.push({
      success: sendResult.success,
      channel,
      messageId: sendResult.messageId,
      error: sendResult.error,
    })
  }

  return results
}

/**
 * Process pending notifications (called by cron job)
 */
export async function processPendingNotifications(): Promise<{
  processed: number
  sent: number
  failed: number
}> {
  const supabase = createAdminClient()
  const stats = { processed: 0, sent: 0, failed: 0 }

  // Get pending notifications with user info
  const { data: notificationsData, error } = await supabase
    .from("notifications")
    .select(`
      id,
      user_id,
      type,
      channel,
      title,
      body,
      retry_count,
      user:profiles!notifications_user_id_fkey(email, phone)
    `)
    .eq("status", "pending")
    .lt("retry_count", MAX_RETRY_ATTEMPTS)
    .order("created_at", { ascending: true })
    .limit(50) // Process in batches

  if (error || !notificationsData) {
    console.error("Error fetching pending notifications:", error)
    return stats
  }

  const notifications = notificationsData as unknown as NotificationWithUser[]

  for (const notification of notifications) {
    stats.processed++
    const user = notification.user

    if (!user) {
      await supabase
        .from("notifications")
        .update({
          status: "failed",
          error_message: "User not found",
        } as Record<string, unknown>)
        .eq("id", notification.id)
      stats.failed++
      continue
    }

    let sendResult: { success: boolean; messageId?: string; error?: string }

    if (notification.channel === "email") {
      sendResult = await sendEmail({
        to: user.email,
        subject: notification.title,
        html: `<p>${notification.body.replace(/\n/g, "<br>")}</p>`,
        text: notification.body,
      })
    } else if (notification.channel === "sms") {
      if (!user.phone) {
        sendResult = { success: false, error: "No phone number" }
      } else if (!isSMSConfigured()) {
        sendResult = { success: false, error: "SMS not configured" }
      } else {
        sendResult = await sendSMS({
          to: user.phone,
          text: notification.body,
        })
      }
    } else {
      sendResult = { success: false, error: "Unknown channel" }
    }

    // Update notification
    if (sendResult.success) {
      await supabase
        .from("notifications")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          error_message: null,
        } as Record<string, unknown>)
        .eq("id", notification.id)
      stats.sent++
    } else {
      const newRetryCount = (notification.retry_count || 0) + 1
      await supabase
        .from("notifications")
        .update({
          status: newRetryCount >= MAX_RETRY_ATTEMPTS ? "failed" : "pending",
          error_message: sendResult.error || null,
          retry_count: newRetryCount,
        } as Record<string, unknown>)
        .eq("id", notification.id)
      stats.failed++
    }

    // Small delay between sends to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 50))
  }

  return stats
}

/**
 * Check user's notification preferences for a specific type
 */
export async function getUserNotificationPreferences(
  userId: string,
  notificationType: NotificationType
): Promise<{ emailEnabled: boolean; smsEnabled: boolean }> {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from("notification_preferences")
    .select("email_enabled, sms_enabled")
    .eq("user_id", userId)
    .eq("notification_type", notificationType)
    .single()

  const prefs = data as NotificationPreferenceRecord | null

  // Default to email enabled if no preferences set
  return {
    emailEnabled: prefs?.email_enabled ?? true,
    smsEnabled: prefs?.sms_enabled ?? false,
  }
}

/**
 * Send notification respecting user preferences
 */
export async function sendNotificationWithPreferences(
  payload: Omit<NotificationPayload, "channels">
): Promise<SendResult[]> {
  const prefs = await getUserNotificationPreferences(payload.userId, payload.type)

  const channels: ("email" | "sms")[] = []
  if (prefs.emailEnabled) channels.push("email")
  if (prefs.smsEnabled) channels.push("sms")

  if (channels.length === 0) {
    return []
  }

  return sendNotificationNow({ ...payload, channels })
}
