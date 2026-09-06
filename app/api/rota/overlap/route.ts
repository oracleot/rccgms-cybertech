/**
 * GET /api/rota/overlap?userIds=a,b,c&startDate=YYYY-MM-DD&days=30
 *
 * Cross-person availability overlap, used by the meeting form's
 * "dates that suit the team" suggestions and the Rota page's
 * Availability tab. Leader+ only (same gate as team availability).
 */

import { NextRequest, NextResponse } from "next/server"

import { getCurrentProfile } from "@/lib/auth/profile"
import { getAvailabilityOverlap, suggestMeetingDates } from "@/lib/meetings/availability-overlap"

const MAX_RANGE_DAYS = 92
const MANAGER_ROLES = ["admin", "lead_developer", "leader"]

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export async function GET(request: NextRequest) {
  const profile = await getCurrentProfile()
  if (!profile) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
  if (!MANAGER_ROLES.includes(profile.role)) {
    return NextResponse.json(
      { error: "Only admins, lead developers, and leaders can view team availability" },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(request.url)
  const userIdsParam = searchParams.get("userIds")
  const userIds = userIdsParam ? userIdsParam.split(",").filter(Boolean) : []

  if (userIds.length === 0) {
    return NextResponse.json({ error: "userIds is required" }, { status: 400 })
  }

  const startDate = searchParams.get("startDate") || new Date().toISOString().slice(0, 10)
  const requestedDays = Number(searchParams.get("days") || "30")
  const days = Number.isFinite(requestedDays)
    ? Math.min(Math.max(requestedDays, 1), MAX_RANGE_DAYS)
    : 30
  const endDate = addDays(startDate, days)

  const overlap = await getAvailabilityOverlap(userIds, startDate, endDate)
  const suggestions = suggestMeetingDates(overlap, 5)

  return NextResponse.json({ overlap, suggestions }, { status: 200 })
}
