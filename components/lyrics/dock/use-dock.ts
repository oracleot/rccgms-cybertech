"use client"

/**
 * All of the Lyrics/Prayer OBS dock's state and actions in one hook. Mirrors
 * the Bible dock's proven shape (lock enforced by the display, preview vs
 * live kept apart, undo, presentation-only Simple/Advanced) on its own
 * lyrics-obs channel — nothing here touches the Bible dock or its state.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { lyricsChannelName, monitorChannelName } from "@/lib/lyrics/channel"
import { loadLock, saveLock, type LockPayload } from "@/lib/lyrics/lock"
import { LYRICS_DEFAULTS, loadSettings, saveSettings, type LyricsSettings } from "@/lib/lyrics/settings"
import { loadCachedSets, subscribeToSets, syncSets } from "@/lib/lyrics/store"
import { buildMonitorState, MONITOR_REQUEST_EVENT, MONITOR_STATE_EVENT } from "@/lib/lyrics/monitor"
import type { LyricItemPayload, LyricSet } from "@/lib/lyrics/types"

const UI_MODE_KEY = "lyrics-dock-ui-mode"
const PREFS_KEY = "lyrics-dock-prefs"
const UNDO_DEPTH = 10

export type UiMode = "simple" | "advanced"

function loadUiMode(): UiMode {
  try {
    return window.localStorage.getItem(UI_MODE_KEY) === "advanced" ? "advanced" : "simple"
  } catch {
    return "simple"
  }
}
function saveUiMode(m: UiMode) {
  try {
    window.localStorage.setItem(UI_MODE_KEY, m)
  } catch {
    // non-fatal
  }
}

interface Prefs {
  previewFirst?: boolean
}
function loadPrefs(): Prefs {
  try {
    const raw = window.localStorage.getItem(PREFS_KEY)
    return raw ? (JSON.parse(raw) as Prefs) : {}
  } catch {
    return {}
  }
}
function savePrefs(p: Prefs) {
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify({ ...loadPrefs(), ...p }))
  } catch {
    // non-fatal
  }
}

export function useLyricsDock(roomId: string) {
  const [sets, setSets] = useState<LyricSet[]>([])
  const [setsError, setSetsError] = useState<string | null>(null)
  const [offline, setOffline] = useState(false)
  const [activeSet, setActiveSetState] = useState<LyricSet | null>(null)
  const [activeIndex, setActiveIndexState] = useState(0)
  const [onScreen, setOnScreen] = useState<LyricItemPayload | null>(null)
  const [staged, setStaged] = useState<LyricItemPayload | null>(null)
  const [settings, setSettings] = useState<LyricsSettings>(LYRICS_DEFAULTS)
  const [locked, setLockedState] = useState(false)
  const [uiMode, setUiModeState] = useState<UiMode>("simple")
  const [canUndo, setCanUndo] = useState(false)
  const [previewFirst, setPreviewFirstState] = useState(false)
  const [autoOn, setAutoOnState] = useState(false)
  const [autoPaused, setAutoPausedState] = useState(false)
  const [autoInterval, setAutoIntervalState] = useState(5)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase's RealtimeChannel type isn't exported for a ref
  const channelRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- as above; the monitor-only channel
  const monitorChannelRef = useRef<any>(null)
  const setsRef = useRef<LyricSet[]>([])
  const activeSetRef = useRef<LyricSet | null>(null)
  const activeIndexRef = useRef(0)
  const onScreenRef = useRef<LyricItemPayload | null>(null)
  const stagedRef = useRef<LyricItemPayload | null>(null)
  const settingsRef = useRef(settings)
  const lockedRef = useRef(false)
  const previewFirstRef = useRef(false)
  const undoRef = useRef<Array<LyricItemPayload | null>>([])
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoOnRef = useRef(false)
  const autoPausedRef = useRef(false)
  const autoIntervalRef = useRef(5)

  useEffect(() => {
    const stored = loadSettings(roomId)
    settingsRef.current = stored
    setSettings(stored)
    const wasLocked = loadLock(roomId)
    lockedRef.current = wasLocked
    setLockedState(wasLocked)
    setUiModeState(loadUiMode())
    const prefs = loadPrefs()
    previewFirstRef.current = !!prefs.previewFirst
    setPreviewFirstState(!!prefs.previewFirst)
  }, [roomId])

  /**
   * Re-reads the shared library from Supabase and reconciles the active set
   * against it. Only ever moves server → local: a failed fetch keeps showing
   * the cached copy (never invented, never pushed back up), so a stale
   * connection can't quietly overwrite what's actually on the server once it
   * comes back — the next successful fetch simply replaces the cache outright.
   */
  const refreshSets = useCallback(async () => {
    const { sets: fresh, source } = await syncSets()
    setsRef.current = fresh
    setSets(fresh)
    setOffline(source === "cache")
    setSetsError(source === "cache" ? "Offline — using the last cached library" : null)
    if (activeSetRef.current) {
      const refreshed = fresh.find((s) => s.id === activeSetRef.current!.id) ?? null
      activeSetRef.current = refreshed
      setActiveSetState(refreshed)
    }
  }, [])

  // The library lives in Supabase (lyric_sets) so it's visible to every client,
  // including an OBS Browser Source — which runs inside OBS's own embedded
  // Chromium with a storage profile entirely separate from the operator's
  // normal browser, so localStorage alone can never bridge the two. The
  // cached copy paints instantly while the real fetch is in flight; the
  // realtime subscription keeps every open client in sync afterwards.
  useEffect(() => {
    const cached = loadCachedSets()
    setsRef.current = cached
    setSets(cached)
    void refreshSets()
    const unsubscribe = subscribeToSets(() => void refreshSets())
    return unsubscribe
  }, [refreshSets])

  const setUiMode = useCallback((m: UiMode) => {
    setUiModeState(m)
    saveUiMode(m)
  }, [])

  const applyLock = useCallback((on: boolean) => {
    lockedRef.current = on
    setLockedState(on)
    saveLock(roomId, on)
  }, [roomId])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(lyricsChannelName(roomId), {
      config: { broadcast: { self: true } },
    })
    channel
      .on("broadcast", { event: "item" }, ({ payload }: { payload: LyricItemPayload }) => {
        if (lockedRef.current && !payload.restore) return
        setOnScreen(payload)
        onScreenRef.current = payload
      })
      .on("broadcast", { event: "clear" }, () => {
        if (lockedRef.current) return
        setOnScreen(null)
        onScreenRef.current = null
      })
      .on("broadcast", { event: "request-state" }, () => {
        channel.send({ type: "broadcast", event: "settings", payload: settingsRef.current })
        channel.send({ type: "broadcast", event: "lock", payload: { locked: lockedRef.current } })
        const cur = onScreenRef.current
        if (cur) channel.send({ type: "broadcast", event: "item", payload: { ...cur, restore: true } })
      })
      .on("broadcast", { event: "lock" }, ({ payload }: { payload: LockPayload }) => applyLock(!!payload?.locked))
      .on("broadcast", { event: "lock-state" }, ({ payload }: { payload: LockPayload }) => applyLock(!!payload?.locked))
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          channel.send({ type: "broadcast", event: "request-lock", payload: {} })
        }
      })
    channelRef.current = channel
    return () => {
      channel.unsubscribe()
    }
  }, [applyLock, roomId])

  // Snapshot for a monitor, read from refs so it's callable from the channel
  // handler (a stable closure). Never carries anything a monitor could use to
  // change the broadcast.
  const snapshotFromRefs = useCallback(
    () =>
      buildMonitorState({
        activeSet: activeSetRef.current,
        onScreen: onScreenRef.current,
        staged: stagedRef.current,
        locked: lockedRef.current,
        previewFirst: previewFirstRef.current,
        autoOn: autoOnRef.current,
        autoPaused: autoPausedRef.current,
        autoInterval: autoIntervalRef.current,
      }),
    []
  )

  // Monitors live on a SEPARATE channel from the display. The display never
  // subscribes to it, so nothing a monitor sends — even a hand-crafted
  // broadcast from someone the link was forwarded to — can reach the on-screen
  // output. The dock is the only publisher of monitor-state; a monitor only
  // ever asks for a snapshot.
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(monitorChannelName(roomId), { config: { broadcast: { self: false } } })
    channel
      .on("broadcast", { event: MONITOR_REQUEST_EVENT }, () => {
        channel.send({ type: "broadcast", event: MONITOR_STATE_EVENT, payload: snapshotFromRefs() })
      })
      .subscribe()
    monitorChannelRef.current = channel
    return () => {
      channel.unsubscribe()
    }
  }, [snapshotFromRefs, roomId])

  // Push a fresh monitor snapshot whenever anything a monitor shows changes, so
  // an already-connected monitor tracks the service live rather than only on
  // its initial request.
  useEffect(() => {
    monitorChannelRef.current?.send({ type: "broadcast", event: MONITOR_STATE_EVENT, payload: snapshotFromRefs() })
  }, [snapshotFromRefs, onScreen, staged, locked, previewFirst, autoOn, autoPaused, autoInterval, activeSet, activeIndex])

  const pushSettings = useCallback((next: LyricsSettings) => {
    settingsRef.current = next
    setSettings(next)
    saveSettings(roomId, next)
    channelRef.current?.send({ type: "broadcast", event: "settings", payload: next })
  }, [roomId])

  const updateSetting = useCallback(
    <K extends keyof LyricsSettings>(key: K, value: LyricsSettings[K]) => {
      pushSettings({ ...settingsRef.current, [key]: value })
    },
    [pushSettings]
  )

  const remember = useCallback(() => {
    undoRef.current = [...undoRef.current.slice(-(UNDO_DEPTH - 1)), onScreenRef.current]
    setCanUndo(true)
  }, [])

  /** The lock protects the stream, not staging: with preview on, a locked dock can still prepare what's next. */
  const send = useCallback((payload: LyricItemPayload, opts?: { live?: boolean }): boolean => {
    const wouldGoLive = !previewFirstRef.current || !!opts?.live
    if (lockedRef.current && wouldGoLive) return false
    if (previewFirstRef.current && !opts?.live) {
      stagedRef.current = payload
      setStaged(payload)
      return false
    }
    remember()
    channelRef.current?.send({ type: "broadcast", event: "item", payload })
    setOnScreen(payload)
    onScreenRef.current = payload
    stagedRef.current = null
    setStaged(null)
    return true
  }, [remember])

  const goLive = useCallback(() => {
    const s = stagedRef.current
    if (!s || lockedRef.current) return
    remember()
    channelRef.current?.send({ type: "broadcast", event: "item", payload: s })
    setOnScreen(s)
    onScreenRef.current = s
    stagedRef.current = null
    setStaged(null)
  }, [remember])

  const discardStaged = useCallback(() => {
    stagedRef.current = null
    setStaged(null)
  }, [])

  const clear = useCallback(() => {
    if (lockedRef.current) return
    remember()
    channelRef.current?.send({ type: "broadcast", event: "clear", payload: {} })
    setOnScreen(null)
    onScreenRef.current = null
  }, [remember])

  const undo = useCallback(() => {
    if (lockedRef.current) return
    const stack = undoRef.current
    if (!stack.length) return
    const prevItem = stack.pop()!
    setCanUndo(stack.length > 0)
    if (prevItem) {
      channelRef.current?.send({ type: "broadcast", event: "item", payload: prevItem })
      setOnScreen(prevItem)
      onScreenRef.current = prevItem
    } else {
      channelRef.current?.send({ type: "broadcast", event: "clear", payload: {} })
      setOnScreen(null)
      onScreenRef.current = null
    }
  }, [])

  const setLocked = useCallback(
    (on: boolean) => {
      applyLock(on)
      channelRef.current?.send({ type: "broadcast", event: "lock", payload: { locked: on } })
    },
    [applyLock]
  )

  const setPreviewFirst = useCallback((on: boolean) => {
    previewFirstRef.current = on
    setPreviewFirstState(on)
    savePrefs({ previewFirst: on })
    if (!on) {
      stagedRef.current = null
      setStaged(null)
    }
  }, [])

  // ---- auto mode

  const clearAutoTimer = useCallback(() => {
    if (autoTimerRef.current) {
      clearInterval(autoTimerRef.current)
      autoTimerRef.current = null
    }
  }, [])

  const stopAuto = useCallback(() => {
    clearAutoTimer()
    autoOnRef.current = false
    setAutoOnState(false)
    autoPausedRef.current = false
    setAutoPausedState(false)
  }, [clearAutoTimer])

  const itemAt = useCallback((set: LyricSet, i: number): LyricItemPayload => ({
    setId: set.id,
    setTitle: set.title,
    type: set.type,
    group: set.groups[i],
    index: i,
    total: set.groups.length,
  }), [])

  const tickAuto = useCallback(() => {
    const set = activeSetRef.current
    if (!set) return
    const ni = activeIndexRef.current + 1
    if (ni >= set.groups.length) {
      stopAuto()
      return
    }
    activeIndexRef.current = ni
    setActiveIndexState(ni)
    send(itemAt(set, ni), { live: true })
  }, [send, itemAt, stopAuto])

  const startAuto = useCallback(() => {
    if (!activeSetRef.current) return
    clearAutoTimer()
    autoOnRef.current = true
    setAutoOnState(true)
    autoPausedRef.current = false
    setAutoPausedState(false)
    autoTimerRef.current = setInterval(tickAuto, autoIntervalRef.current * 1000)
  }, [clearAutoTimer, tickAuto])

  const pauseAuto = useCallback(() => {
    clearAutoTimer()
    autoPausedRef.current = true
    setAutoPausedState(true)
  }, [clearAutoTimer])

  const resumeAuto = useCallback(() => {
    if (!autoOnRef.current) return
    clearAutoTimer()
    autoPausedRef.current = false
    setAutoPausedState(false)
    autoTimerRef.current = setInterval(tickAuto, autoIntervalRef.current * 1000)
  }, [clearAutoTimer, tickAuto])

  const resetAutoTimer = useCallback(() => {
    if (autoOnRef.current && !autoPausedRef.current) {
      clearAutoTimer()
      autoTimerRef.current = setInterval(tickAuto, autoIntervalRef.current * 1000)
    }
  }, [clearAutoTimer, tickAuto])

  const setAutoInterval = useCallback(
    (sec: number) => {
      const v = Math.max(1, Math.min(600, Math.round(sec)))
      autoIntervalRef.current = v
      setAutoIntervalState(v)
      resetAutoTimer()
    },
    [resetAutoTimer]
  )

  useEffect(() => clearAutoTimer, [clearAutoTimer])

  // ---- navigation

  const move = useCallback(
    (delta: 1 | -1) => {
      const set = activeSetRef.current
      if (!set || !set.groups.length) return
      const ni = Math.min(Math.max(activeIndexRef.current + delta, 0), set.groups.length - 1)
      activeIndexRef.current = ni
      setActiveIndexState(ni)
      send(itemAt(set, ni))
      resetAutoTimer()
    },
    [send, itemAt, resetAutoTimer]
  )

  const next = useCallback(() => move(1), [move])
  const prev = useCallback(() => move(-1), [move])

  const jumpTo = useCallback(
    (i: number) => {
      const set = activeSetRef.current
      if (!set || i < 0 || i >= set.groups.length) return
      activeIndexRef.current = i
      setActiveIndexState(i)
      send(itemAt(set, i))
      resetAutoTimer()
    },
    [send, itemAt, resetAutoTimer]
  )

  const selectSet = useCallback(
    (id: string) => {
      const set = setsRef.current.find((s) => s.id === id) ?? null
      stopAuto()
      activeSetRef.current = set
      setActiveSetState(set)
      activeIndexRef.current = 0
      setActiveIndexState(0)
    },
    [stopAuto]
  )

  // Creating, editing, reordering and deleting sets all happen on the
  // authenticated /lyrics management page, never here — the dock has no
  // session (an OBS Browser Source can't log in), and RLS only grants
  // authenticated clients write access to lyric_sets, on purpose: an OBS
  // Browser Source getting write/delete access to the shared library would
  // be an unnecessary privilege it doesn't need to do its job. The dock only
  // ever reads the library and drives the live item.

  // ← → / ↑ ↓ prev/next · Space advances · Escape clears · never while typing
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault()
        prev()
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault()
        next()
      } else if (e.key === "Escape") {
        e.preventDefault()
        clear()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [prev, next, clear])

  const canPrev = !!activeSet && activeIndex > 0
  const canNext = !!activeSet && activeIndex < activeSet.groups.length - 1
  const canSend = !locked || previewFirst
  const stagingOnly = locked && previewFirst

  return {
    sets,
    setsError,
    offline,
    activeSet,
    activeIndex,
    onScreen,
    staged,
    settings,
    updateSetting,
    pushSettings,
    locked,
    setLocked,
    canSend,
    stagingOnly,
    uiMode,
    setUiMode,
    canUndo,
    undo,
    previewFirst,
    setPreviewFirst,
    goLive,
    discardStaged,
    selectSet,
    next,
    prev,
    canPrev,
    canNext,
    jumpTo,
    clear,
    autoOn,
    autoPaused,
    autoInterval,
    setAutoInterval,
    startAuto,
    pauseAuto,
    resumeAuto,
    stopAuto,
  }
}

export type LyricsDock = ReturnType<typeof useLyricsDock>
