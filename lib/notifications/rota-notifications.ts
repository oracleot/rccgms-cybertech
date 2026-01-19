/**
 * Rota Notification Service
 * 
 * Handles sending notifications when rotas are published or updated
 */

import { createAdminClient } from "@/lib/supabase/admin"

interface RotaAssignmentNotification {
  userId: string
  email: string
  name: string
  positionName: string
  serviceName: string
  date: string
  startTime: string | null
  location: string | null
}

// Type definitions for Supabase query results
interface RotaQueryResult {
  id: string
  date: string
  service: { name: string; start_time: string | null; location: string | null } | null
  assignments: Array<{
    id: string
    user: { id: string; email: string; name: string } | null
    position: { name: string } | null
  }> | null
}

interface NotificationPreferences {
  email_enabled: boolean
  sms_enabled: boolean
  reminder_timing?: string
}

interface ReminderAssignment {
  id: string
  user: { id: string; email: string; name: string; phone: string | null } | null
  position: { name: string } | null
  rota: {
    id: string
    date: string
    status: string
    service: { name: string; start_time: string | null; location: string | null } | null
  } | null
}

/**
 * Queue notifications for all assigned volunteers when a rota is published
 */
export async function sendRotaPublishedNotifications(rotaId: string): Promise<{
  queued: number
  failed: number
}> {
  const supabase = createAdminClient()
  let queued = 0
  let failed = 0

  try {
    // Fetch rota with assignments
    const { data: rotaData, error: rotaError } = await supabase
      .from("rotas")
      .select(`
        id,
        date,
        service:services(name, start_time, location),
        assignments:rota_assignments(
          id,
          user:profiles(id, email, name),
          position:positions(name)
        )
      `)
      .eq("id", rotaId)
      .single()

    if (rotaError || !rotaData) {
      console.error("Failed to fetch rota:", rotaError)
      return { queued: 0, failed: 1 }
    }

    const rota = rotaData as unknown as RotaQueryResult

    const assignments: RotaAssignmentNotification[] = (rota.assignments || [])
      .filter((a) => a.user !== null)
      .map((a) => ({
        userId: a.user!.id,
        email: a.user!.email,
        name: a.user!.name,
        positionName: a.position?.name || "Position",
        serviceName: rota.service?.name || "Service",
        date: rota.date,
        startTime: rota.service?.start_time || null,
        location: rota.service?.location || null,
      }))

    // Create notification records for each assignment
    for (const assignment of assignments) {
      try {
        // Check user's notification preferences
        const { data: preferencesData } = await supabase
          .from("notification_preferences")
          .select("email_enabled, sms_enabled")
          .eq("user_id", assignment.userId)
          .eq("notification_type", "rota_assignment")
          .single()

        const preferences = preferencesData as unknown as NotificationPreferences | null
        const emailEnabled = preferences?.email_enabled ?? true

        if (emailEnabled) {
          // Create email notification record
          const { error: notifError } = await supabase
            .from("notifications")
            .insert({
              user_id: assignment.userId,
              type: "rota_assignment",
              channel: "email",
              title: `You've been scheduled for ${assignment.serviceName}`,
              body: `Hi ${assignment.name},\n\nYou have been assigned to ${assignment.positionName} for ${assignment.serviceName} on ${new Date(assignment.date).toLocaleDateString()}.${assignment.startTime ? `\n\nTime: ${assignment.startTime.slice(0, 5)}` : ""}${assignment.location ? `\nLocation: ${assignment.location}` : ""}\n\nPlease confirm your availability.`,
              data: {
                rotaId,
                positionName: assignment.positionName,
                serviceName: assignment.serviceName,
                date: assignment.date,
              },
              status: "pending",
            } as never)

          if (notifError) {
            console.error("Failed to create notification:", notifError)
            failed++
          } else {
            queued++
          }
        }
      } catch (error) {
        console.error("Error processing notification for user:", assignment.userId, error)
        failed++
      }
    }

    return { queued, failed }
  } catch (error) {
    console.error("Error in sendRotaPublishedNotifications:", error)
    return { queued, failed: failed + 1 }
  }
}

/**
 * Send reminder notifications for upcoming rotas
 * Called by the cron job
 */
export async function sendRotaReminders(): Promise<{
  sent: { email: number; sms: number }
  failed: number
}> {
  const supabase = createAdminClient()
  const result = { sent: { email: 0, sms: 0 }, failed: 0 }

  try {
    // Get date ranges for reminders (1 day before, 3 days before)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split("T")[0]

    const threeDaysFromNow = new Date()
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
    const threeDaysStr = threeDaysFromNow.toISOString().split("T")[0]

    // Fetch assignments for dates that need reminders
    const { data: assignmentsData, error } = await supabase
      .from("rota_assignments")
      .select(`
        id,
        user:profiles(id, email, name, phone),
        position:positions(name),
        rota:rotas(
          id,
          date,
          status,
          service:services(name, start_time, location)
        )
      `)
      .eq("rota.status", "published")
      .in("rota.date", [tomorrowStr, threeDaysStr])

    if (error) {
      console.error("Error fetching assignments for reminders:", error)
      return result
    }

    const assignments = (assignmentsData || []) as unknown as ReminderAssignment[]

    for (const assignment of assignments) {
      if (!assignment.user || !assignment.rota) continue

      const daysUntil = assignment.rota.date === tomorrowStr ? "1_day" : "3_days"

      // Check user preferences
      const { data: preferencesData } = await supabase
        .from("notification_preferences")
        .select("email_enabled, sms_enabled, reminder_timing")
        .eq("user_id", assignment.user.id)
        .eq("notification_type", "rota_reminder")
        .single()

      const preferences = preferencesData as unknown as NotificationPreferences | null
      const reminderTiming = preferences?.reminder_timing || "1_day"
      
      // Only send if timing matches preference
      if (daysUntil !== reminderTiming) continue

      const emailEnabled = preferences?.email_enabled ?? true
      const smsEnabled = preferences?.sms_enabled ?? false

      // Create email notification
      if (emailEnabled) {
        const { error: emailError } = await supabase
          .from("notifications")
          .insert({
            user_id: assignment.user.id,
            type: "rota_reminder",
            channel: "email",
            title: `Reminder: ${assignment.rota.service?.name} ${daysUntil === "1_day" ? "tomorrow" : "in 3 days"}`,
            body: `Hi ${assignment.user.name},\n\nThis is a reminder that you are scheduled for ${assignment.position?.name} at ${assignment.rota.service?.name} on ${new Date(assignment.rota.date).toLocaleDateString()}.`,
            data: {
              rotaId: assignment.rota.id,
              date: assignment.rota.date,
            },
            status: "pending",
          } as never)

        if (emailError) {
          result.failed++
        } else {
          result.sent.email++
        }
      }

      // Create SMS notification (if enabled and phone available)
      if (smsEnabled && assignment.user.phone) {
        const { error: smsError } = await supabase
          .from("notifications")
          .insert({
            user_id: assignment.user.id,
            type: "rota_reminder",
            channel: "sms",
            title: "Service Reminder",
            body: `Reminder: You are scheduled for ${assignment.position?.name} ${daysUntil === "1_day" ? "tomorrow" : "in 3 days"} at ${assignment.rota.service?.name}.`,
            data: {
              rotaId: assignment.rota.id,
              date: assignment.rota.date,
            },
            status: "pending",
          } as never)

        if (smsError) {
          result.failed++
        } else {
          result.sent.sms++
        }
      }
    }

    return result
  } catch (error) {
    console.error("Error in sendRotaReminders:", error)
    return result
  }
}
