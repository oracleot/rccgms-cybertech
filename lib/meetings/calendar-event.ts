/**
 * Maps a meeting DB row (+ minimal joined info) to the provider-neutral
 * `CalendarEvent` shape used by lib/calendar.
 */

import type { CalendarEvent } from "@/lib/calendar"
import type { Meeting } from "@/types/meeting"
import { platformLabel } from "@/lib/meetings/platforms"

export interface MeetingForCalendar extends Meeting {
  creatorEmail?: string | null
  creatorName?: string | null
  attendeeEmails?: string[]
}

export function meetingToCalendarEvent(meeting: MeetingForCalendar): CalendarEvent {
  const descriptionParts: string[] = []
  if (meeting.agenda) descriptionParts.push(meeting.agenda)
  if (meeting.platform !== "in_person" && meeting.meeting_link) {
    descriptionParts.push(`Join ${platformLabel(meeting.platform)}: ${meeting.meeting_link}`)
  }

  return {
    id: meeting.id,
    title: meeting.title,
    description: descriptionParts.length > 0 ? descriptionParts.join("\n\n") : undefined,
    location:
      meeting.platform === "in_person"
        ? meeting.location || undefined
        : meeting.meeting_link || undefined,
    startTime: new Date(meeting.start_time),
    endTime: new Date(meeting.end_time),
    organizerEmail: meeting.creatorEmail || undefined,
    organizerName: meeting.creatorName || undefined,
    attendeeEmails: meeting.attendeeEmails || [],
    isCancellation: meeting.status === "cancelled",
  }
}
