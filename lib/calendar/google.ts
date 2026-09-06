/**
 * Google Calendar sync provider.
 *
 * Built on the existing `googleapis` dependency. There is no per-user
 * OAuth token store yet, so `isConnectedFor()` always returns false today -
 * this makes the provider degrade cleanly to the ICS/"add to calendar
 * link" path (lib/calendar/ics.ts, lib/calendar/links.ts) rather than
 * throwing. The `CalendarProvider` interface is fully wired up, so real
 * sync activates the moment a token store is added; nothing calling
 * through `lib/calendar/index.ts` needs to change.
 */

import { google } from "googleapis"

import type { CalendarEvent, CalendarProvider, CalendarSyncResult } from "./types"

/**
 * Placeholder for a future per-user OAuth token lookup (e.g. a
 * `calendar_connections` table). Returns null until that exists.
 */
async function getStoredTokensForUser(
  _userId: string
): Promise<{ accessToken: string; refreshToken: string } | null> {
  return null
}

function toGoogleEvent(event: CalendarEvent) {
  return {
    summary: event.title,
    description: event.description,
    location: event.location,
    start: { dateTime: event.startTime.toISOString() },
    end: { dateTime: event.endTime.toISOString() },
    attendees: (event.attendeeEmails || []).map((email) => ({ email })),
  }
}

class GoogleCalendarProvider implements CalendarProvider {
  readonly name = "google"

  isConfigured(): boolean {
    return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
  }

  async isConnectedFor(userId: string): Promise<boolean> {
    if (!this.isConfigured()) return false
    const tokens = await getStoredTokensForUser(userId)
    return tokens !== null
  }

  private async getClient(userId: string) {
    const tokens = await getStoredTokensForUser(userId)
    if (!tokens) return null

    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    )
    auth.setCredentials({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    })

    return google.calendar({ version: "v3", auth })
  }

  async createEvent(userId: string, event: CalendarEvent): Promise<CalendarSyncResult> {
    const client = await this.getClient(userId)
    if (!client) {
      return { provider: this.name, success: false, error: "Not connected" }
    }

    try {
      const { data } = await client.events.insert({
        calendarId: "primary",
        requestBody: toGoogleEvent(event),
      })
      return { provider: this.name, success: true, externalEventId: data.id ?? undefined }
    } catch (error) {
      return {
        provider: this.name,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  async updateEvent(
    userId: string,
    externalEventId: string,
    event: CalendarEvent
  ): Promise<CalendarSyncResult> {
    const client = await this.getClient(userId)
    if (!client) {
      return { provider: this.name, success: false, error: "Not connected" }
    }

    try {
      const { data } = await client.events.update({
        calendarId: "primary",
        eventId: externalEventId,
        requestBody: toGoogleEvent(event),
      })
      return { provider: this.name, success: true, externalEventId: data.id ?? undefined }
    } catch (error) {
      return {
        provider: this.name,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  async deleteEvent(userId: string, externalEventId: string): Promise<CalendarSyncResult> {
    const client = await this.getClient(userId)
    if (!client) {
      return { provider: this.name, success: false, error: "Not connected" }
    }

    try {
      await client.events.delete({ calendarId: "primary", eventId: externalEventId })
      return { provider: this.name, success: true }
    } catch (error) {
      return {
        provider: this.name,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }
}

export const googleCalendarProvider = new GoogleCalendarProvider()
