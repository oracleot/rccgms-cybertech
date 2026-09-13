/**
 * Live lock, shared across every client on the channel.
 *
 * A dock is where the operator toggles it, so a dock's value wins; the
 * display enforces it — while locked it ignores passage, clear and nav from
 * anyone, including a Bible Reader that knows nothing about the lock. Both
 * sides cache it so an OBS source or dock that restarts comes back in the
 * same state rather than silently unlocked.
 *
 * State restore is not a change: the dock marks its reply to request-state
 * with restore, and the display accepts those while locked, so switching
 * scenes mid-reading still brings the verse back.
 */

const LOCK_KEY = "bible-obs-locked"

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
