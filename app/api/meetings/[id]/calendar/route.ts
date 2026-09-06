/**
 * GET /api/meetings/[id]/calendar - downloads the meeting as a .ics file
 *
 * Uses the regular (RLS-scoped) server client, not the admin client, so
 * visibility is governed by the same RLS policies as everywhere else: a
 * manager, the creator, or an invited attendee can download it - nobody
 * else.
 */

import { NextRequest, NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { generateIcs } from "@/lib/calendar"
import { meetingToCalendarEvent } from "@/lib/meetings/calendar-event"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const { data: meeting, error } = await supabase
    .from("meetings")
    .select(
      `
      id, title, agenda, platform, meeting_link, location,
      start_time, end_time, timezone, status,
      creator:profiles!meetings_created_by_fkey(email, name),
      attendees:meeting_attendees(user:profiles(email))
    `
    )
    .eq("id", id)
    .single()

  if (error || !meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 })
  }

  const event = meetingToCalendarEvent({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase's inferred join shape doesn't line up 1:1 with the Meeting row type
    ...(meeting as any),
    creatorEmail: meeting.creator?.email ?? null,
    creatorName: meeting.creator?.name ?? null,
    attendeeEmails: (meeting.attendees || [])
      .map((a) => a.user?.email)
      .filter((email): email is string => Boolean(email)),
  })

  const ics = generateIcs(event, {
    method: meeting.status === "cancelled" ? "CANCEL" : "REQUEST",
  })

  const filename = `${meeting.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.ics`

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
