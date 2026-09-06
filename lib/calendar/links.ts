/**
 * Prefilled "add to calendar" links for Google, Outlook and Yahoo.
 *
 * These require zero configuration and work for every user immediately -
 * no OAuth, no connected account. They're the baseline every meeting gets;
 * a real provider sync (see google.ts) is additive on top.
 */

import type { CalendarEvent } from "./types"

function toGoogleDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")
}

export function googleCalendarLink(event: CalendarEvent): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${toGoogleDate(event.startTime)}/${toGoogleDate(event.endTime)}`,
  })
  if (event.description) params.set("details", event.description)
  if (event.location) params.set("location", event.location)

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function outlookCalendarLink(event: CalendarEvent): string {
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    startdt: event.startTime.toISOString(),
    enddt: event.endTime.toISOString(),
  })
  if (event.description) params.set("body", event.description)
  if (event.location) params.set("location", event.location)

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
}

export function yahooCalendarLink(event: CalendarEvent): string {
  const durationMs = event.endTime.getTime() - event.startTime.getTime()
  const durationHours = Math.floor(durationMs / 3_600_000)
  const durationMinutes = Math.floor((durationMs % 3_600_000) / 60_000)

  const params = new URLSearchParams({
    v: "60",
    title: event.title,
    st: event.startTime.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z"),
    dur: `${String(durationHours).padStart(2, "0")}${String(durationMinutes).padStart(2, "0")}`,
  })
  if (event.description) params.set("desc", event.description)
  if (event.location) params.set("in_loc", event.location)

  return `https://calendar.yahoo.com/?${params.toString()}`
}

export interface CalendarLinks {
  google: string
  outlook: string
  yahoo: string
}

export function getCalendarLinks(event: CalendarEvent): CalendarLinks {
  return {
    google: googleCalendarLink(event),
    outlook: outlookCalendarLink(event),
    yahoo: yahooCalendarLink(event),
  }
}
