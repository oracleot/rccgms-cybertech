/**
 * Live lock for the Lyrics OBS display, shared across every client on the
 * lyrics-obs channel. Same design as the Bible lock: the dock is where the
 * operator toggles it, the display enforces it against everyone (including a
 * management page that knows nothing about the lock), and both sides cache
 * it so a source or dock that restarts comes back in the same state.
 */

const LOCK_KEY = "lyrics-obs-locked"

export interface LockPayload {
  locked?: boolean
}

export function loadLock(): boolean {
  try {
    return window.localStorage.getItem(LOCK_KEY) === "1"
  } catch {
    return false
  }
}

export function saveLock(on: boolean): void {
  try {
    window.localStorage.setItem(LOCK_KEY, on ? "1" : "0")
  } catch {
    // non-fatal: the lock still applies for this session
  }
}
