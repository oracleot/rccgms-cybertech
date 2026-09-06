/**
 * Meeting Notification Service
 *
 * Handles invite / update / cancel / reminder notifications for meetings.
 * Uses the admin client (service role) since this runs from server
 * actions and cron on behalf of multiple users, bypassing RLS by design.
 */

import { createAdminClient } from "@/lib/supabase/admin"
import { formatMeetingDate, formatMeetingTimeRange } from "@/lib/meetings/format"
import { platformLabel } from "@/lib/meetings/platforms"
import type { MeetingPlatform } from "@/types/meeting"

interface MeetingForNotification {
  id: string
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
    .select("id, title, start_time, end_time, timezone, platform, meeting_link, location, reminder_lead_minutes")
    .eq("id", meetingId)
    .single()

  if (error || !data) return null
  return data as MeetingForNotification
}

async function queueForUsers(
  userIds: string[],
  type: "meeting_invited" | "meeting_updated" | "meeting_cancelled" | "meeting_reminder",
  title: string,
  body: string,
  data: Record<string, unknown>
): Promise<{ queued: number; failed: number }> {
  if (userIds.length === 0) return { queued: 0, failed: 0 }

  const supabase = createAdminClient()
  const rows = userIds.map((userId) => ({
    user_id: userId,
    type,
    channel: "email",
    title,
    body,
    data,
    status: "pending",
  }))

  const { error } = await supabase.from("notifications").insert(rows)

  if (error) {
    console.error(`Failed to queue ${type} notifications:`, error)
    return { queued: 0, failed: userIds.length }
  }

  return { queued: userIds.length, failed: 0 }
}

/**
 * Notify newly-added attendees that they've been invited to a meeting.
 * People already on the meeting who are just seeing an update to details
 * should go through `notifyMeetingUpdated` instead, not this.
 */
export async function notifyMeetingInvited(
  meetingId: string,
  newAttendeeUserIds: string[]
): Promise<{ queued: number; failed: number }> {
  const meeting = await fetchMeeting(meetingId)
  if (!meeting) return { queued: 0, failed: newAttendeeUserIds.length }

  return queueForUsers(
    newAttendeeUserIds,
    "meeting_invited",
    `You're invited: ${meeting.title}`,
    buildMeetingBody(meeting),
    { meetingId }
  )
}

/**
 * Notify existing attendees that a meeting's details changed (time,
 * platform, link, etc).
 */
export async function notifyMeetingUpdated(
  meetingId: string,
  existingAttendeeUserIds: string[]
): Promise<{ queued: number; failed: number }> {
  const meeting = await fetchMeeting(meetingId)
  if (!meeting) return { queued: 0, failed: existingAttendeeUserIds.length }

  return queueForUsers(
    existingAttendeeUserIds,
    "meeting_updated",
    `Meeting updated: ${meeting.title}`,
    buildMeetingBody(meeting),
    { meetingId }
  )
}

/**
 * Notify all attendees that a meeting was cancelled.
 */
export async function notifyMeetingCancelled(
  meetingId: string,
  attendeeUserIds: string[]
): Promise<{ queued: number; failed: number }> {
  const meeting = await fetchMeeting(meetingId)
  if (!meeting) return { queued: 0, failed: attendeeUserIds.length }

  return queueForUsers(
    attendeeUserIds,
    "meeting_cancelled",
    `Cancelled: ${meeting.title}`,
    buildMeetingBody(meeting),
    { meetingId }
  )
}

/**
 * Sends reminders for meetings whose reminder lead time has arrived.
 * Called by the daily reminders cron.
 *
 * Idempotent via `reminder_sent_at`: a meeting is only ever reminded
 * once, regardless of how many times this runs or how late a cron catch-up
 * lands - rather than matching a time window against the cron's own
 * cadence, which would silently skip a meeting if a run was missed.
 * `updateMeeting` clears the marker when a meeting is rescheduled so a
 * fresh reminder goes out for the new time.
 */
export async function sendDueMeetingReminders(): Promise<{ sent: number; failed: number }> {
  const supabase = createAdminClient()
  const result = { sent: 0, failed: 0 }
  const now = new Date()

  // Bound the scan to meetings starting in the next 7 days - reminder
  // lead times are configured in minutes/hours, never that far out.
  const horizon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const { data: candidates, error } = await supabase
    .from("meetings")
    .select("id, title, start_time, end_time, timezone, platform, meeting_link, location, reminder_lead_minutes")
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

    const userIds = (attendees || []).map((a) => a.user_id as string)

    const { failed } = await queueForUsers(
      userIds,
      "meeting_reminder",
      `Reminder: ${meeting.title} starts soon`,
      buildMeetingBody(meeting),
      { meetingId: meeting.id }
    )

    // Mark as sent even if some individual queues failed - we don't want
    // to spam attendees with duplicate reminders on the next cron pass
    // just because one notification insert failed.
    const { error: markError } = await supabase
      .from("meetings")
      .update({ reminder_sent_at: now.toISOString() })
      .eq("id", meeting.id)
      .is("reminder_sent_at", null)

    if (markError) {
      console.error(`Failed to mark reminder sent for meeting ${meeting.id}:`, markError)
    }

    result.sent += userIds.length - failed
    result.failed += failed
  }

  return result
}
