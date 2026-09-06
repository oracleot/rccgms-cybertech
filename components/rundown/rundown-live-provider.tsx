"use client"

/**
 * Owns rundown live-session state (which item is current, whether the timer
 * is running, and the timestamps needed to compute elapsed time) above the
 * `/rundown/[id]/live` page, in the (dashboard) layout. Mounting it there
 * means the session survives client-side navigation to any other Fusion
 * page: the leaf page can unmount and remount freely, but the underlying
 * timer, transition state, and BroadcastChannel connection to the Display
 * Screen keep running the whole time.
 *
 * Elapsed time is always derived from `itemStartedAt` / `accumulatedMs`
 * rather than stored as a plain number, so it is correct on every read
 * regardless of how long ago the last render happened - no
 * snapshot-on-unmount/restore-on-remount step is needed.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import { useDisplaySync } from "@/hooks/use-display-sync"
import type { RundownItemType, ItemChangePayload, TransitionPayload, DisplaySyncMessage } from "@/types/rundown"

export interface RundownLiveItem {
  id: string
  type: RundownItemType
  title: string
  durationSeconds: number
  notes: string | null
  songId?: string | null
}

interface RundownLiveSession {
  rundownId: string
  rundownPath: string
  serviceName: string | null
  items: RundownLiveItem[]
  currentIndex: number
  started: boolean
  isInTransition: boolean
  currentVerseIndex: number
  /** Epoch ms the current run segment began; null while paused or not running. */
  itemStartedAt: number | null
  /** Elapsed ms banked for the current item, excluding the in-progress run segment. */
  accumulatedMs: number
  isPaused: boolean
}

const STORAGE_PREFIX = "fusion_live_session_"
const storageKey = (rundownId: string) => `${STORAGE_PREFIX}${rundownId}`

interface StoredSession extends Omit<RundownLiveSession, "items"> {
  items: RundownLiveItem[]
}

function loadStoredSession(rundownId: string): RundownLiveSession | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(storageKey(rundownId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredSession
    if (!parsed.started) return null
    return parsed
  } catch {
    return null
  }
}

function saveStoredSession(session: RundownLiveSession) {
  if (typeof window === "undefined") return
  localStorage.setItem(storageKey(session.rundownId), JSON.stringify(session))
}

function clearStoredSession(rundownId: string) {
  if (typeof window === "undefined") return
  localStorage.removeItem(storageKey(rundownId))
}

export function getElapsedMs(session: RundownLiveSession): number {
  if (!session.started) return 0
  if (session.itemStartedAt === null) return session.accumulatedMs
  return session.accumulatedMs + (Date.now() - session.itemStartedAt)
}

function freshSession(
  rundownId: string,
  rundownPath: string,
  items: RundownLiveItem[],
  serviceName: string | null
): RundownLiveSession {
  return {
    rundownId,
    rundownPath,
    serviceName,
    items,
    currentIndex: 0,
    started: false,
    isInTransition: false,
    currentVerseIndex: 0,
    itemStartedAt: null,
    accumulatedMs: 0,
    isPaused: false,
  }
}

interface RundownLiveContextValue {
  sessions: Record<string, RundownLiveSession>
  /** Re-render tick, bumped ~4x/sec so elapsed-derived UI stays live. */
  tick: number
  registerRundown: (rundownId: string, rundownPath: string, items: RundownLiveItem[], serviceName: string | null) => void
  startService: (rundownId: string) => void
  pauseResume: (rundownId: string) => void
  seekTo: (rundownId: string, newElapsedSeconds: number) => void
  resetTimer: (rundownId: string) => void
  rewind: (rundownId: string, seconds: number) => void
  fastForward: (rundownId: string, seconds: number) => void
  goToItem: (rundownId: string, index: number) => void
  goToPrevious: (rundownId: string) => void
  skipToNext: (rundownId: string) => void
  startNextItem: (rundownId: string) => void
  resetService: (rundownId: string) => void
  setVerseIndex: (rundownId: string, index: number, totalVerses: number) => void
  displayCounts: Record<string, number>
}

const RundownLiveContext = createContext<RundownLiveContextValue | null>(null)

export function RundownLiveProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<Record<string, RundownLiveSession>>({})
  const [tick, setTick] = useState(0)
  const [displayCounts, setDisplayCounts] = useState<Record<string, number>>({})
  const sessionsRef = useRef(sessions)
  useEffect(() => {
    sessionsRef.current = sessions
  }, [sessions])

  const handleDisplayMessage = useCallback((message: DisplaySyncMessage) => {
    if (message.type !== "DISPLAY_READY" && message.type !== "DISPLAY_CLOSED") return
    const { rundownId } = message.payload
    setDisplayCounts((prev) => {
      const current = prev[rundownId] ?? 0
      const next = message.type === "DISPLAY_READY" ? current + 1 : Math.max(0, current - 1)
      return { ...prev, [rundownId]: next }
    })
  }, [])

  // A single BroadcastChannel connection, opened once for the lifetime of the
  // dashboard shell rather than the Rundown leaf page, so the Display Screen
  // keeps receiving updates while the operator browses other Fusion pages.
  const { sendMessage } = useDisplaySync({ rundownId: "*", onMessage: handleDisplayMessage })

  const updateSession = useCallback(
    (rundownId: string, updater: (session: RundownLiveSession) => RundownLiveSession) => {
      setSessions((prev) => {
        const existing = prev[rundownId]
        if (!existing) return prev
        const next = updater(existing)
        saveStoredSession(next)
        return { ...prev, [rundownId]: next }
      })
    },
    []
  )

  const registerRundown = useCallback(
    (rundownId: string, rundownPath: string, items: RundownLiveItem[], serviceName: string | null) => {
      setSessions((prev) => {
        if (prev[rundownId]) {
          // Already tracked (returning to the page mid-session) - refresh
          // static fields only, never touch timer/index state.
          return {
            ...prev,
            [rundownId]: { ...prev[rundownId], rundownPath, items, serviceName },
          }
        }
        const restored = loadStoredSession(rundownId)
        const session = restored
          ? { ...restored, rundownPath, items, serviceName }
          : freshSession(rundownId, rundownPath, items, serviceName)
        return { ...prev, [rundownId]: session }
      })
    },
    []
  )

  const buildItemPayload = useCallback((session: RundownLiveSession, index: number): ItemChangePayload => {
    const item = session.items[index]
    const next = session.items[index + 1]
    return {
      currentItemIndex: index,
      item: item
        ? { id: item.id, type: item.type, title: item.title, durationSeconds: item.durationSeconds, notes: item.notes }
        : null,
      nextItem: next
        ? { id: next.id, type: next.type, title: next.title, durationSeconds: next.durationSeconds }
        : undefined,
    }
  }, [])

  const startService = useCallback(
    (rundownId: string) => {
      const s = sessionsRef.current[rundownId]
      if (!s) return
      updateSession(rundownId, (session) => ({
        ...session,
        started: true,
        currentIndex: 0,
        isInTransition: false,
        currentVerseIndex: 0,
        itemStartedAt: Date.now(),
        accumulatedMs: 0,
        isPaused: false,
      }))
      sendMessage({ type: "ITEM_CHANGE", payload: buildItemPayload(s, 0) })
    },
    [updateSession, sendMessage, buildItemPayload]
  )

  const pauseResume = useCallback(
    (rundownId: string) => {
      updateSession(rundownId, (s) => {
        if (s.isPaused) {
          return { ...s, isPaused: false, itemStartedAt: Date.now() }
        }
        return { ...s, isPaused: true, accumulatedMs: getElapsedMs(s), itemStartedAt: null }
      })
    },
    [updateSession]
  )

  const seekTo = useCallback(
    (rundownId: string, newElapsedSeconds: number) => {
      updateSession(rundownId, (s) => {
        const ms = Math.max(0, newElapsedSeconds * 1000)
        return { ...s, accumulatedMs: ms, itemStartedAt: s.isPaused ? null : Date.now() }
      })
    },
    [updateSession]
  )

  const resetTimer = useCallback(
    (rundownId: string) => {
      updateSession(rundownId, (s) => ({ ...s, accumulatedMs: 0, itemStartedAt: null, isPaused: true }))
    },
    [updateSession]
  )

  const rewind = useCallback(
    (rundownId: string, seconds: number) => {
      const s = sessionsRef.current[rundownId]
      if (!s) return
      const currentSeconds = Math.floor(getElapsedMs(s) / 1000)
      seekTo(rundownId, Math.max(0, currentSeconds - seconds))
    },
    [seekTo]
  )

  const fastForward = useCallback(
    (rundownId: string, seconds: number) => {
      const s = sessionsRef.current[rundownId]
      if (!s) return
      const item = s.items[s.currentIndex]
      const currentSeconds = Math.floor(getElapsedMs(s) / 1000)
      const maxSeconds = item?.durationSeconds ? item.durationSeconds + 300 : currentSeconds + seconds
      seekTo(rundownId, Math.min(maxSeconds, currentSeconds + seconds))
    },
    [seekTo]
  )

  const goToItem = useCallback(
    (rundownId: string, index: number) => {
      const s = sessionsRef.current[rundownId]
      if (!s || index < 0 || index >= s.items.length) return
      updateSession(rundownId, (session) => ({
        ...session,
        started: true,
        currentIndex: index,
        isInTransition: false,
        currentVerseIndex: 0,
        itemStartedAt: Date.now(),
        accumulatedMs: 0,
        isPaused: false,
      }))
      sendMessage({ type: "ITEM_CHANGE", payload: buildItemPayload(s, index) })
      sendMessage({
        type: "TRANSITION",
        payload: { isInTransition: false, completedItem: null, nextItem: null, serviceName: s.serviceName },
      })
    },
    [updateSession, sendMessage, buildItemPayload]
  )

  const goToPrevious = useCallback(
    (rundownId: string) => {
      const s = sessionsRef.current[rundownId]
      if (!s || s.currentIndex <= 0) return
      goToItem(rundownId, s.currentIndex - 1)
    },
    [goToItem]
  )

  const skipToNext = useCallback(
    (rundownId: string) => {
      const s = sessionsRef.current[rundownId]
      if (!s || s.currentIndex >= s.items.length - 1) return
      updateSession(rundownId, (session) => ({ ...session, isInTransition: true }))
      const item = s.items[s.currentIndex]
      const next = s.items[s.currentIndex + 1]
      sendMessage({
        type: "TRANSITION",
        payload: {
          isInTransition: true,
          completedItem: item ? { id: item.id, title: item.title, type: item.type } : null,
          nextItem: next
            ? { id: next.id, title: next.title, type: next.type, durationSeconds: next.durationSeconds, notes: next.notes }
            : null,
          serviceName: s.serviceName,
        },
      })
    },
    [updateSession, sendMessage]
  )

  const startNextItem = useCallback(
    (rundownId: string) => {
      const s = sessionsRef.current[rundownId]
      if (!s || !s.isInTransition || s.currentIndex >= s.items.length - 1) return
      goToItem(rundownId, s.currentIndex + 1)
    },
    [goToItem]
  )

  const resetService = useCallback(
    (rundownId: string) => {
      const s = sessionsRef.current[rundownId]
      updateSession(rundownId, (session) => ({
        ...session,
        started: false,
        isInTransition: false,
        currentIndex: 0,
        currentVerseIndex: 0,
        itemStartedAt: null,
        accumulatedMs: 0,
        isPaused: false,
      }))
      clearStoredSession(rundownId)
      sendMessage({
        type: "TRANSITION",
        payload: { isInTransition: false, completedItem: null, nextItem: null, serviceName: s?.serviceName ?? null },
      })
    },
    [updateSession, sendMessage]
  )

  const setVerseIndex = useCallback(
    (rundownId: string, index: number, totalVerses: number) => {
      updateSession(rundownId, (s) => ({ ...s, currentVerseIndex: index }))
      sendMessage({
        type: "LYRIC_ADVANCE",
        payload: { currentVerseIndex: index, totalVerses },
      })
    },
    [updateSession, sendMessage]
  )

  // Global engine loop: ticks the UI, auto-transitions items whose duration
  // has elapsed, and keeps the Display Screen in sync - independent of
  // whether the operator is currently looking at the Rundown page.
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1)

      for (const session of Object.values(sessionsRef.current)) {
        if (!session.started) continue
        const item = session.items[session.currentIndex]
        if (!item) continue

        const elapsedSeconds = Math.floor(getElapsedMs(session) / 1000)

        if (
          !session.isPaused &&
          !session.isInTransition &&
          item.durationSeconds > 0 &&
          elapsedSeconds >= item.durationSeconds
        ) {
          const next = session.items[session.currentIndex + 1]
          const payload: TransitionPayload = {
            isInTransition: true,
            completedItem: { id: item.id, title: item.title, type: item.type },
            nextItem: next
              ? { id: next.id, title: next.title, type: next.type, durationSeconds: next.durationSeconds, notes: next.notes }
              : null,
            serviceName: session.serviceName,
          }
          updateSession(session.rundownId, (s) => ({ ...s, isInTransition: true }))
          sendMessage({ type: "TRANSITION", payload })
          continue
        }

        sendMessage({
          type: "TIMER_UPDATE",
          payload: {
            elapsed: elapsedSeconds,
            remaining: Math.max(0, item.durationSeconds - elapsedSeconds),
            isRunning: !session.isPaused,
          },
        })
      }
    }, 250)

    return () => clearInterval(interval)
  }, [updateSession, sendMessage])

  const value = useMemo<RundownLiveContextValue>(
    () => ({
      sessions,
      tick,
      registerRundown,
      startService,
      pauseResume,
      seekTo,
      resetTimer,
      rewind,
      fastForward,
      goToItem,
      goToPrevious,
      skipToNext,
      startNextItem,
      resetService,
      setVerseIndex,
      displayCounts,
    }),
    [
      sessions,
      tick,
      registerRundown,
      startService,
      pauseResume,
      seekTo,
      resetTimer,
      rewind,
      fastForward,
      goToItem,
      goToPrevious,
      skipToNext,
      startNextItem,
      resetService,
      setVerseIndex,
      displayCounts,
    ]
  )

  return <RundownLiveContext.Provider value={value}>{children}</RundownLiveContext.Provider>
}

export function useRundownLive() {
  const ctx = useContext(RundownLiveContext)
  if (!ctx) throw new Error("useRundownLive must be used within a RundownLiveProvider")
  return ctx
}
