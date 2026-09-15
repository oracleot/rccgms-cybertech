/**
 * Live lock for the Lyrics OBS display, shared across every client on the
 * lyrics-obs channel. Same design as the Bible lock: the dock is where the
 * operator toggles it, the display enforces it against everyone (including a
 * management page that knows nothing about the lock), and both sides cache
 * it so a source or dock that restarts comes back in the same state.
 */

// Keyed per room, so a display or dock reloading restores only its own room's
// lock — switching rooms never carries a stale lock across.
const LOCK_KEY = "lyrics-obs-locked"

function key(roomId: string): string {
  return `${LOCK_KEY}:${roomId}`
}

export interface LockPayload {
  locked?: boolean
}

export function loadLock(roomId: string): boolean {
  try {
    return window.localStorage.getItem(key(roomId)) === "1"
  } catch {
    return false
  }
}

export function saveLock(roomId: string, on: boolean): void {
  try {
    window.localStorage.setItem(key(roomId), on ? "1" : "0")
  } catch {
    // non-fatal: the lock still applies for this session
  }
}
