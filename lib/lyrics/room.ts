/**
 * Broadcast rooms for the public Lyrics OBS tool.
 *
 * A Broadcast ID namespaces one realtime session end to end, so two operators
 * on the same production host — the church live, and someone testing at home —
 * never touch each other's display, dock or monitor. The ID is the session
 * boundary; knowing it is what grants access to that room (like a meeting ID),
 * which is why it must be unguessable rather than sequential or derived from
 * anyone's account.
 */

// A deliberately confusable-free alphabet: no 0/O, 1/I/L. Uppercase only, so a
// Broadcast ID read aloud or typed on a phone survives the trip.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
const ID_LENGTH = 8
// Accept 6–12 so a hand-typed or future-length ID still validates.
const ID_RE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6,12}$/

const REMEMBERED_KEY = "lyrics-room-id"

/** A cryptographically random Broadcast ID — never sequential, never account-derived. */
export function generateRoomId(): string {
  const bytes = new Uint32Array(ID_LENGTH)
  crypto.getRandomValues(bytes)
  let id = ""
  for (let i = 0; i < ID_LENGTH; i++) id += ALPHABET[bytes[i] % ALPHABET.length]
  return id
}

/** True for a well-formed Broadcast ID. */
export function isValidRoomId(raw: unknown): raw is string {
  return typeof raw === "string" && ID_RE.test(raw)
}

/**
 * Normalises an ID arriving from a URL or an input box: upper-cases, strips the
 * confusable characters people type instead (O→0 dropped, etc.), and returns it
 * only if the result is valid. Anything unusable returns null, so the caller
 * falls into the room screen rather than joining a malformed channel.
 */
export function sanitizeRoomId(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null
  const cleaned = raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    // Fold the characters the alphabet excludes onto their look-alikes, so a
    // person typing O/0 or I/1 still lands in the right room.
    .replace(/[O0]/g, "")
    .replace(/[IL1]/g, "")
  return isValidRoomId(cleaned) ? cleaned : null
}

export function rememberRoom(id: string): void {
  try {
    window.localStorage.setItem(REMEMBERED_KEY, id)
  } catch {
    // non-fatal: the room still works for this session, just not remembered
  }
}

export function rememberedRoom(): string | null {
  try {
    return sanitizeRoomId(window.localStorage.getItem(REMEMBERED_KEY))
  } catch {
    return null
  }
}

export function forgetRoom(): void {
  try {
    window.localStorage.removeItem(REMEMBERED_KEY)
  } catch {
    // non-fatal
  }
}

/** Reads and validates the room from a URL's query string. */
export function roomFromSearch(search: string): string | null {
  return sanitizeRoomId(new URLSearchParams(search).get("room"))
}
