/**
 * Single import surface for calendar integration. Meeting code should
 * import from here - never reach into `./google` or a specific provider
 * directly - so adding a provider later never requires touching callers.
 */

import type { CalendarEvent, CalendarProvider, CalendarSyncResult } from "./types"
import { googleCalendarProvider } from "./google"

export type { CalendarEvent, CalendarProvider, CalendarSyncResult } from "./types"
export { generateIcs, type IcsOptions } from "./ics"
export { getCalendarLinks, googleCalendarLink, outlookCalendarLink, yahooCalendarLink, type CalendarLinks } from "./links"
export { zonedToUtc, utcToZoned, COMMON_TIMEZONES } from "./timezone"

const ALL_PROVIDERS: CalendarProvider[] = [googleCalendarProvider]

/** Providers that have the app-level credentials to run at all. */
export function configuredProviders(): CalendarProvider[] {
  return ALL_PROVIDERS.filter((provider) => provider.isConfigured())
}

/**
 * Syncs an event to every provider a user is connected to. Each
 * provider's failure is caught and reported individually - one broken
 * provider can never sink a meeting or block the ICS/link fallback that
 * always ships alongside this.
 */
export async function syncEventForUser(
  userId: string,
  event: CalendarEvent
): Promise<CalendarSyncResult[]> {
  const results: CalendarSyncResult[] = []

  for (const provider of configuredProviders()) {
    try {
      const isConnected = await provider.isConnectedFor(userId)
      if (!isConnected) continue

      results.push(await provider.createEvent(userId, event))
    } catch (error) {
      results.push({
        provider: provider.name,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  return results
}
