"use client"

/**
 * Read-only view of the live-session rows RundownLiveProvider persists to
 * localStorage (see components/rundown/rundown-live-provider.tsx), used by
 * the passive cross-page banner. Only the fields the banner actually reads
 * are declared here; the provider owns the full shape and the write path.
 */
export interface LiveSessionState {
  rundownId: string
  rundownPath: string
  serviceName: string | null
  started: boolean
}

const ALL_SESSIONS_PREFIX = "fusion_live_session_"

/** Read all active sessions across any rundown (for the banner) */
export function getAllActiveSessions(): LiveSessionState[] {
  if (typeof window === "undefined") return []
  const sessions: LiveSessionState[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (!k?.startsWith(ALL_SESSIONS_PREFIX)) continue
    try {
      const parsed = JSON.parse(localStorage.getItem(k) ?? "") as LiveSessionState
      if (parsed.started) sessions.push(parsed)
    } catch {
      // ignore corrupt entries
    }
  }
  return sessions
}
