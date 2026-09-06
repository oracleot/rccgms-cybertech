/**
 * Meeting date/time display helpers.
 *
 * Times are always rendered in the *meeting's own* timezone, not the
 * viewer's - a 7pm meeting should read as 7pm for everyone invited,
 * regardless of where they're physically logging in from.
 */

import { utcToZoned } from "@/lib/calendar"

function formatTimeParts(time: string): string {
  const [hourStr, minuteStr] = time.split(":")
  const hour = Number(hourStr)
  const minute = Number(minuteStr)
  const period = hour >= 12 ? "PM" : "AM"
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  return minute === 0 ? `${hour12}${period}` : `${hour12}:${String(minute).padStart(2, "0")}${period}`
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

/** e.g. "Wed, 4 Sep 2026" */
export function formatMeetingDate(isoStart: string, timezone: string): string {
  const { date } = utcToZoned(new Date(isoStart), timezone)
  const [year, month, day] = date.split("-").map(Number)
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]
  return `${weekday.slice(0, 3)}, ${day} ${MONTHS[month - 1].slice(0, 3)} ${year}`
}

/** e.g. "7:00PM - 8:30PM (Europe/London)" */
export function formatMeetingTimeRange(isoStart: string, isoEnd: string, timezone: string): string {
  const start = utcToZoned(new Date(isoStart), timezone)
  const end = utcToZoned(new Date(isoEnd), timezone)
  return `${formatTimeParts(start.time)} - ${formatTimeParts(end.time)} (${timezone})`
}

/** e.g. "Wed, 4 Sep 2026, 7:00PM - 8:30PM (Europe/London)" */
export function formatMeetingDateTime(isoStart: string, isoEnd: string, timezone: string): string {
  return `${formatMeetingDate(isoStart, timezone)}, ${formatMeetingTimeRange(isoStart, isoEnd, timezone)}`
}
