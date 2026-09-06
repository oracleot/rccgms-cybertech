/**
 * Provider-agnostic calendar types.
 *
 * Meeting code should only ever import from `lib/calendar` (the index
 * barrel) and never name a vendor directly - that's what lets a new
 * provider be added later without touching anything upstream.
 */

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  location?: string
  startTime: Date
  endTime: Date
  organizerEmail?: string
  organizerName?: string
  attendeeEmails?: string[]
  /** Set when the event represents a cancellation of a previously synced event. */
  isCancellation?: boolean
}

export interface CalendarSyncResult {
  provider: string
  success: boolean
  externalEventId?: string
  error?: string
}

/**
 * A calendar backend a user could be connected to. Implementations are
 * expected to fail soft: `isConnectedFor` returning false (rather than
 * throwing) is how a provider says "not available for this user yet" so
 * the caller can fall back to the ICS/link path.
 */
export interface CalendarProvider {
  readonly name: string
  /** Whether this provider has the app-level credentials it needs to run at all. */
  isConfigured(): boolean
  /** Whether a specific user has connected this provider (e.g. has a stored OAuth token). */
  isConnectedFor(userId: string): Promise<boolean>
  createEvent(userId: string, event: CalendarEvent): Promise<CalendarSyncResult>
  updateEvent(userId: string, externalEventId: string, event: CalendarEvent): Promise<CalendarSyncResult>
  deleteEvent(userId: string, externalEventId: string): Promise<CalendarSyncResult>
}
