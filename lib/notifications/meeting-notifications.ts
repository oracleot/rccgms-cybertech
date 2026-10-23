/**
 * Meeting Notification Service
 *
 * Handles invite, update, cancellation, and reminder emails for meetings.
 * Uses the admin client because server actions and cron send on behalf of users.
 */

import { formatMeetingDate, formatMeetingTimeRange } from "@/lib/meetings/format"
import { platformLabel } from "@/lib/meetings/platforms"
import { sendNotificationNow } from "@/lib/notifications/notification-service"
import { createAdminClient } from "@/lib/supabase/admin"
import type { MeetingPlatform } from "@/types/meeting"

export interface MeetingNotificationResult {
  sent: number
  queued: number
  failed: number
}

interface MeetingForNotification {
  id: string
  parish_id: string
  title: string
  start_time: string
  end_time: string
  timezone: string
  platform: MeetingPlatform
  meeting_link: string | null
  location: string | null
  reminder_lead_minutes: number
}

function buildMeetingBody(meeting: MeetingForNotification): string {
  const lines = [
    `Meeting: ${meeting.title}`,
    `Date: ${formatMeetingDate(meeting.start_time, meeting.timezone)}`,
    `Time: ${formatMeetingTimeRange(meeting.start_time, meeting.end_time, meeting.timezone)}`,
    `Platform: ${platformLabel(meeting.platform)}`,
  ]

  if (meeting.platform === "in_person") {
    if (meeting.location) lines.push(`Location: ${meeting.location}`)
  } else if (meeting.meeting_link) {
    lines.push(`Join Meeting → ${meeting.meeting_link}`)
  }

  return lines.join("\n")
}

async function fetchMeeting(meetingId: string): Promise<MeetingForNotification | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("meetings")
    .select("id, parish_id, title, start_time, end_time, timezone, platform, meeting_link, location, reminder_lead_minutes")
    .eq("id", meetingId)
    .single()

  if (error || !data) return null
  return data as MeetingForNotification
}

async function sendToUsers(
  userIds: string[],
  type: "meeting_invited" | "meeting_updated" | "meeting_cancelled" | "meeting_reminder",
  title: string,
  body: string,
  data: Record<string, unknown>,
  parishId: string
): Promise<MeetingNotificationResult> {
  const summary: MeetingNotificationResult = { sent: 0, queued: 0, failed: 0 }

  for (const userId of userIds) {
    const [result] = await sendNotificationNow({
      userId,
      parish_id: parishId,
      type,
      title,
      body,
      data,
      channels: ["email"],
    })

    if (result?.success) summary.sent++
    else if (result?.queuedForRetry) summary.queued++
    else summary.failed++
  }

  return summary
}

export async function notifyMeetingInvited(
  meetingId: string,
  newAttendeeUserIds: string[]
): Promise<MeetingNotificationResult> {
  const meeting = await fetchMeeting(meetingId)
  if (!meeting) return { sent: 0, queued: 0, failed: newAttendeeUserIds.length }

  return sendToUsers(
    newAttendeeUserIds,
    "meeting_invited",
    `You're invited: ${meeting.title}`,
    buildMeetingBody(meeting),
    { meetingId },
    meeting.parish_id
  )
}

export async function notifyMeetingUpdated(
  meetingId: string,
  existingAttendeeUserIds: string[]
): Promise<MeetingNotificationResult> {
  const meeting = await fetchMeeting(meetingId)
  if (!meeting) return { sent: 0, queued: 0, failed: existingAttendeeUserIds.length }

  return sendToUsers(
    existingAttendeeUserIds,
    "meeting_updated",
    `Meeting updated: ${meeting.title}`,
    buildMeetingBody(meeting),
    { meetingId },
    meeting.parish_id
  )
}

export async function notifyMeetingCancelled(
  meetingId: string,
  attendeeUserIds: string[]
): Promise<MeetingNotificationResult> {
  const meeting = await fetchMeeting(meetingId)
  if (!meeting) return { sent: 0, queued: 0, failed: attendeeUserIds.length }

  return sendToUsers(
    attendeeUserIds,
    "meeting_cancelled",
    `Cancelled: ${meeting.title}`,
    buildMeetingBody(meeting),
    { meetingId },
    meeting.parish_id
  )
}

export async function sendDueMeetingReminders(): Promise<{ sent: number; failed: number }> {
  const supabase = createAdminClient()
  const result = { sent: 0, failed: 0 }
  const now = new Date()
  const horizon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const { data: candidates, error } = await supabase
    .from("meetings")
    .select("id, parish_id, title, start_time, end_time, timezone, platform, meeting_link, location, reminder_lead_minutes")
    .eq("status", "scheduled")
    .is("reminder_sent_at", null)
    .gt("end_time", now.toISOString())
    .lte("start_time", horizon.toISOString())

  if (error || !candidates) {
    console.error("Error fetching meeting reminder candidates:", error)
    return result
  }

  for (const meeting of candidates as MeetingForNotification[]) {
    const dueAt = new Date(meeting.start_time).getTime() - meeting.reminder_lead_minutes * 60_000
    if (now.getTime() < dueAt) continue

    const { data: attendees } = await supabase
      .from("meeting_attendees")
      .select("user_id")
      .eq("meeting_id", meeting.id)

    const userIds = (attendees || []).map((attendee) => attendee.user_id as string)
    const delivery = await sendToUsers(
      userIds,
      "meeting_reminder",
      `Reminder: ${meeting.title} starts soon`,
      buildMeetingBody(meeting),
      { meetingId: meeting.id },
      meeting.parish_id
    )

    const { error: markError } = await supabase
      .from("meetings")
      .update({ reminder_sent_at: now.toISOString() })
      .eq("id", meeting.id)
      .is("reminder_sent_at", null)

    if (markError) {
      console.error(`Failed to mark reminder sent for meeting ${meeting.id}:`, markError)
    }

    result.sent += delivery.sent
    result.failed += delivery.failed + delivery.queued
  }

  return result
}
