/**
 * Meeting read queries.
 *
 * All queries run through the regular (RLS-scoped) server client, so a
 * manager sees every meeting while a member sees only what they're
 * invited to or created - the query layer doesn't need its own
 * visibility logic, RLS already does it.
 */

import { createClient } from "@/lib/supabase/server"
import { getCurrentProfile } from "@/lib/auth/profile"
import type {
  MeetingListItem,
  MeetingWithDetails,
  AttendeeResponse,
} from "@/types/meeting"

const MEETING_LIST_SELECT = `
  id, title, agenda, platform, meeting_link, location,
  start_time, end_time, timezone, status, reminder_lead_minutes,
  reminder_sent_at, created_by, created_at, updated_at, cancelled_at,
  attendees:meeting_attendees(user_id, response)
`

interface MeetingListRow {
  id: string
  title: string
  agenda: string | null
  platform: MeetingListItem["platform"]
  meeting_link: string | null
  location: string | null
  start_time: string
  end_time: string
  timezone: string
  status: MeetingListItem["status"]
  reminder_lead_minutes: number
  reminder_sent_at: string | null
  created_by: string
  created_at: string
  updated_at: string
  cancelled_at: string | null
  attendees: Array<{ user_id: string; response: AttendeeResponse }> | null
}

function toListItem(row: MeetingListRow, currentProfileId: string | null): MeetingListItem {
  const attendees = row.attendees || []
  const mine = currentProfileId
    ? attendees.find((a) => a.user_id === currentProfileId)
    : undefined

  return {
    id: row.id,
    title: row.title,
    agenda: row.agenda,
    platform: row.platform,
    meeting_link: row.meeting_link,
    location: row.location,
    start_time: row.start_time,
    end_time: row.end_time,
    timezone: row.timezone,
    status: row.status,
    reminder_lead_minutes: row.reminder_lead_minutes,
    reminder_sent_at: row.reminder_sent_at,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    cancelled_at: row.cancelled_at,
    attendeeCount: attendees.length,
    myResponse: mine?.response ?? null,
  }
}

export type MeetingListFilter = "upcoming" | "past" | "all"

export async function getMeetings(filter: MeetingListFilter = "upcoming"): Promise<MeetingListItem[]> {
  const supabase = await createClient()
  const profile = await getCurrentProfile()

  let query = supabase
    .from("meetings")
    .select(MEETING_LIST_SELECT)
    .order("start_time", { ascending: filter !== "past" })

  const nowIso = new Date().toISOString()
  if (filter === "upcoming") {
    query = query.gte("end_time", nowIso).neq("status", "cancelled")
  } else if (filter === "past") {
    query = query.lt("end_time", nowIso)
  }

  const { data, error } = await query

  if (error) {
    console.error("Error fetching meetings:", error)
    return []
  }

  return ((data || []) as unknown as MeetingListRow[]).map((row) =>
    toListItem(row, profile?.id ?? null)
  )
}

export async function getUpcomingMeetingsForUser(limit = 5): Promise<MeetingListItem[]> {
  const supabase = await createClient()
  const profile = await getCurrentProfile()
  if (!profile) return []

  const nowIso = new Date().toISOString()

  const { data, error } = await supabase
    .from("meetings")
    .select(MEETING_LIST_SELECT)
    .gte("end_time", nowIso)
    .neq("status", "cancelled")
    .order("start_time", { ascending: true })
    .limit(limit)

  if (error) {
    console.error("Error fetching upcoming meetings:", error)
    return []
  }

  return ((data || []) as unknown as MeetingListRow[]).map((row) => toListItem(row, profile.id))
}

export async function getMeetingById(id: string): Promise<MeetingWithDetails | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("meetings")
    .select(
      `
      *,
      creator:profiles!meetings_created_by_fkey(*),
      attendees:meeting_attendees(*, user:profiles(*))
    `
    )
    .eq("id", id)
    .single()

  if (error || !data) {
    if (error && error.code !== "PGRST116") {
      console.error("Error fetching meeting:", error)
    }
    return null
  }

  return data as unknown as MeetingWithDetails
}
