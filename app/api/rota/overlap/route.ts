/**
 * GET /api/rota/overlap?userIds=a,b,c&startDate=YYYY-MM-DD&days=30
 *
 * Cross-person availability overlap, used by the meeting form's
 * "dates that suit the team" suggestions and the Rota page's
 * Availability tab. Leader+ only (same gate as team availability).
 */

import { NextRequest, NextResponse } from "next/server"

import { getAvailabilityOverlap, suggestMeetingDates } from "@/lib/meetings/availability-overlap"
import { requireActiveParishLeader, isParishAuthFailure } from "@/lib/parish/require-active-parish"

const MAX_RANGE_DAYS = 92

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export async function GET(request: NextRequest) {
  const auth = await requireActiveParishLeader()
  if (isParishAuthFailure(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
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
