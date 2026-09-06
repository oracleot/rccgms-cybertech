/**
 * Hand-rolled RFC 5545 (iCalendar) generation.
 *
 * No external ICS library is used - the format is small enough, and this
 * keeps full control over the two details that most naive generators get
 * wrong: CRLF line endings, and 75-*octet* (not character) line folding.
 */

import type { CalendarEvent } from "./types"

const CRLF = "\r\n"
const MAX_OCTETS_PER_LINE = 75

/**
 * Escapes TEXT values per RFC 5545 section 3.3.11: backslash, semicolon,
 * comma and newline must be escaped.
 */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\n|\r/g, "\\n")
}

/**
 * Folds a content line to a maximum of 75 *octets* per line (RFC 5545
 * section 3.1), splitting on byte boundaries via UTF-8 encoding so a
 * multi-byte character is never split across the fold. Continuation
 * lines are prefixed with a single space, per spec.
 */
function foldLine(line: string): string {
  const bytes = Buffer.from(line, "utf8")
  if (bytes.length <= MAX_OCTETS_PER_LINE) return line

  const chunks: string[] = []
  let offset = 0
  let limit = MAX_OCTETS_PER_LINE

  while (offset < bytes.length) {
    let end = Math.min(offset + limit, bytes.length)

    // Don't split a multi-byte UTF-8 sequence: back off while the next
    // byte is a continuation byte (10xxxxxx).
    while (end < bytes.length && end > offset && (bytes[end] & 0xc0) === 0x80) {
      end--
    }

    chunks.push(bytes.subarray(offset, end).toString("utf8"))
    offset = end
    // Continuation lines are prefixed with a space, which itself counts
    // toward the 75-octet limit of the next physical line.
    limit = MAX_OCTETS_PER_LINE - 1
  }

  return chunks.join(CRLF + " ")
}

function contentLine(name: string, value: string): string {
  return foldLine(`${name}:${value}`)
}

function formatIcsDateUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")
}

export interface IcsOptions {
  /** RFC 5545 UID - stable across updates to the same event. Defaults to `${event.id}@fusion`. */
  uid?: string
  /** REQUEST (default) for a normal invite/update, CANCEL to withdraw a meeting. */
  method?: "REQUEST" | "CANCEL"
  /** Minutes before start_time to fire a VALARM reminder. Omit for no alarm. */
  reminderMinutesBefore?: number
  /** Monotonically increasing revision number; bump on every update so calendar apps apply it. */
  sequence?: number
}

/**
 * Generates a complete .ics file (a single VCALENDAR containing one
 * VEVENT) for a calendar event.
 */
export function generateIcs(event: CalendarEvent, options: IcsOptions = {}): string {
  const uid = options.uid || `${event.id}@fusion`
  const method = options.method || "REQUEST"
  const isCancelled = method === "CANCEL" || event.isCancellation

  const lines: string[] = []
  lines.push(contentLine("BEGIN", "VCALENDAR"))
  lines.push(contentLine("VERSION", "2.0"))
  lines.push(contentLine("PRODID", "-//Fusion//Meetings//EN"))
  lines.push(contentLine("CALSCALE", "GREGORIAN"))
  lines.push(contentLine("METHOD", isCancelled ? "CANCEL" : "REQUEST"))

  lines.push(contentLine("BEGIN", "VEVENT"))
  lines.push(contentLine("UID", uid))
  lines.push(contentLine("SEQUENCE", String(options.sequence ?? 0)))
  lines.push(contentLine("DTSTAMP", formatIcsDateUtc(new Date())))
  lines.push(contentLine("DTSTART", formatIcsDateUtc(event.startTime)))
  lines.push(contentLine("DTEND", formatIcsDateUtc(event.endTime)))
  lines.push(contentLine("SUMMARY", escapeText(event.title)))

  if (event.description) {
    lines.push(contentLine("DESCRIPTION", escapeText(event.description)))
  }
  if (event.location) {
    lines.push(contentLine("LOCATION", escapeText(event.location)))
  }
  if (event.organizerEmail) {
    const cn = event.organizerName ? `;CN=${escapeText(event.organizerName)}` : ""
    lines.push(contentLine("ORGANIZER", `${cn}:mailto:${event.organizerEmail}`))
  }
  for (const email of event.attendeeEmails || []) {
    lines.push(contentLine("ATTENDEE", `:mailto:${email}`))
  }

  lines.push(contentLine("STATUS", isCancelled ? "CANCELLED" : "CONFIRMED"))

  if (!isCancelled && options.reminderMinutesBefore !== undefined && options.reminderMinutesBefore >= 0) {
    lines.push(contentLine("BEGIN", "VALARM"))
    lines.push(contentLine("ACTION", "DISPLAY"))
    lines.push(contentLine("DESCRIPTION", escapeText(`Reminder: ${event.title}`)))
    lines.push(contentLine("TRIGGER", `-PT${options.reminderMinutesBefore}M`))
    lines.push(contentLine("END", "VALARM"))
  }

  lines.push(contentLine("END", "VEVENT"))
  lines.push(contentLine("END", "VCALENDAR"))

  return lines.join(CRLF) + CRLF
}
