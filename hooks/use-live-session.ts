"use client"

export interface LiveSessionState {
  rundownId: string
  rundownPath: string
  serviceName: string | null
  currentIndex: number
  started: boolean
  isInTransition: boolean
  currentVerseIndex: number
  elapsed: number
  isTimerRunning: boolean
  savedAt: number
}

const key = (id: string) => `fusion_live_session_${id}`
const ALL_SESSIONS_PREFIX = "fusion_live_session_"

export function useLiveSession(rundownId: string) {
  function save(state: Omit<LiveSessionState, "rundownId" | "savedAt">) {
    if (typeof window === "undefined") return
    const entry: LiveSessionState = { ...state, rundownId, savedAt: Date.now() }
    localStorage.setItem(key(rundownId), JSON.stringify(entry))
  }

  function load(): LiveSessionState | null {
    if (typeof window === "undefined") return null
    const raw = localStorage.getItem(key(rundownId))
    if (!raw) return null
    try {
      return JSON.parse(raw) as LiveSessionState
    } catch {
      return null
    }
  }

  function clear() {
    if (typeof window === "undefined") return
    localStorage.removeItem(key(rundownId))
  }

  return { save, load, clear }
}

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
