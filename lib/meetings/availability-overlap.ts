/**
 * Cross-person availability overlap for meeting scheduling.
 *
 * Someone who hasn't submitted availability for a date is carried as
 * "unknown", distinct from "busy" - collapsing that distinction would
 * defeat the point of collecting availability in the first place (a
 * manager needs to know "nobody's said" apart from "everyone's out").
 */

import { createClient } from "@/lib/supabase/server"
import type { AvailabilityOverlapDay, FreeBusyState, SuggestedMeetingDate } from "@/types/meeting"

interface PersonInput {
  userId: string
  name: string
}

function enumerateDates(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  const cursor = new Date(`${startDate}T00:00:00.000Z`)
  const end = new Date(`${endDate}T00:00:00.000Z`)

  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  return dates
}

/**
 * Builds a per-date free/busy/unknown picture across a set of people.
 */
export async function getAvailabilityOverlap(
  userIds: string[],
  startDate: string,
  endDate: string
): Promise<AvailabilityOverlapDay[]> {
  if (userIds.length === 0) return []

  const supabase = await createClient()

  const [{ data: profiles }, { data: availability }] = await Promise.all([
    supabase.from("profiles").select("id, name").in("id", userIds),
    supabase
      .from("availability")
      .select("user_id, date, is_available")
      .in("user_id", userIds)
      .gte("date", startDate)
      .lte("date", endDate),
  ])

  const people: PersonInput[] = (profiles || []).map((p) => ({
    userId: p.id,
    name: p.name || "Unknown",
  }))

  // Map of `${userId}|${date}` -> is_available
  const availabilityMap = new Map<string, boolean>()
  for (const row of availability || []) {
    availabilityMap.set(`${row.user_id}|${row.date}`, row.is_available)
  }

  const dates = enumerateDates(startDate, endDate)

  return dates.map((date) => {
    const peopleForDate = people.map((person) => {
      const key = `${person.userId}|${date}`
      let state: FreeBusyState = "unknown"
      if (availabilityMap.has(key)) {
        state = availabilityMap.get(key) ? "free" : "busy"
      }
      return { userId: person.userId, name: person.name, state }
    })

    return {
      date,
      people: peopleForDate,
      freeCount: peopleForDate.filter((p) => p.state === "free").length,
      busyCount: peopleForDate.filter((p) => p.state === "busy").length,
      unknownCount: peopleForDate.filter((p) => p.state === "unknown").length,
    }
  })
}

/**
 * Ranks candidate dates by how many people are free. Dates nobody has
 * responded to at all are excluded - there's nothing to suggest from
 * silence.
 */
export function suggestMeetingDates(
  overlapDays: AvailabilityOverlapDay[],
  limit = 5
): SuggestedMeetingDate[] {
  return overlapDays
    .filter((day) => day.freeCount + day.busyCount > 0)
    .map((day) => ({
      date: day.date,
      freeCount: day.freeCount,
      freeUserIds: day.people.filter((p) => p.state === "free").map((p) => p.userId),
      totalConsidered: day.people.length,
    }))
    .sort((a, b) => b.freeCount - a.freeCount)
    .slice(0, limit)
}
