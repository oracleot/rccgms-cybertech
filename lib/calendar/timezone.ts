/**
 * Timezone conversion without an external tz library.
 *
 * Uses `Intl.DateTimeFormat` (built into Node/the browser, always
 * up-to-date with the IANA tz database) to resolve a wall-clock date/time
 * in a given zone to the correct UTC instant - including across DST
 * transitions.
 */

/**
 * Returns the UTC offset (in ms) that `timeZone` was at for the given
 * instant. A positive value means the zone is ahead of UTC (e.g. BST is
 * +3600000).
 */
function getOffsetMs(instant: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })

  const parts = dtf.formatToParts(instant)
  const map: Record<string, string> = {}
  for (const part of parts) {
    if (part.type !== "literal") map[part.type] = part.value
  }

  // Re-interpret the wall-clock reading (as shown in `timeZone`) as if it
  // were UTC. The difference between that and the real instant is the
  // zone's offset at this point in time.
  const wallAsUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second)
  )

  return wallAsUtc - instant.getTime()
}

/**
 * Converts a wall-clock date + time in a given IANA timezone to the
 * correct UTC `Date`.
 *
 * @param date - "YYYY-MM-DD"
 * @param time - "HH:mm" (24-hour)
 * @param ianaZone - e.g. "Europe/London"
 *
 * Note: for the (rare) hour that's skipped by a spring-forward transition,
 * or repeated by a fall-back transition, the wall time is inherently
 * ambiguous or non-existent; this resolves using the offset in effect at
 * the naive UTC reading of the same numbers, which matches how most
 * calendar libraries behave for that edge case.
 */
export function zonedToUtc(date: string, time: string, ianaZone: string): Date {
  const asIfUtc = new Date(`${date}T${time}:00.000Z`)
  if (Number.isNaN(asIfUtc.getTime())) {
    throw new Error(`Invalid date/time: ${date} ${time}`)
  }

  const offsetMs = getOffsetMs(asIfUtc, ianaZone)
  return new Date(asIfUtc.getTime() - offsetMs)
}

/**
 * Converts a UTC `Date` back to the wall-clock date + time it represents
 * in the given IANA timezone. Inverse of `zonedToUtc`.
 */
export function utcToZoned(instant: Date, ianaZone: string): { date: string; time: string } {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: ianaZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })

  const parts = dtf.formatToParts(instant)
  const map: Record<string, string> = {}
  for (const part of parts) {
    if (part.type !== "literal") map[part.type] = part.value
  }

  return {
    date: `${map.year}-${map.month}-${map.day}`,
    time: `${map.hour}:${map.minute}`,
  }
}

/** A short, common list of IANA zones relevant to the org - used as select options. */
export const COMMON_TIMEZONES = [
  "Europe/London",
  "Europe/Dublin",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Africa/Lagos",
  "UTC",
] as const
