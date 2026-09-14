"use client"

/**
 * All of the Lyrics/Prayer OBS dock's state and actions in one hook. Mirrors
 * the Bible dock's proven shape (lock enforced by the display, preview vs
 * live kept apart, undo, presentation-only Simple/Advanced) on its own
 * lyrics-obs channel — nothing here touches the Bible dock or its state.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { lyricsChannelName } from "@/lib/lyrics/channel"
import { loadLock, saveLock, type LockPayload } from "@/lib/lyrics/lock"
import { LYRICS_DEFAULTS, loadSettings, saveSettings, type LyricsSettings } from "@/lib/lyrics/settings"
import { SETS_KEY, loadSets, removeSet, upsertSet } from "@/lib/lyrics/store"
import { splitContent } from "@/lib/lyrics/parse"
import { newSetId, type ContentType, type LyricItemPayload, type LyricSet } from "@/lib/lyrics/types"

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

export function useLyricsDock() {
  const [sets, setSets] = useState<LyricSet[]>([])
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
    const stored = loadSettings()
    settingsRef.current = stored
    setSettings(stored)
    const wasLocked = loadLock()
    lockedRef.current = wasLocked
    setLockedState(wasLocked)
    setUiModeState(loadUiMode())
    const loadedSets = loadSets()
    setsRef.current = loadedSets
    setSets(loadedSets)
    const prefs = loadPrefs()
    previewFirstRef.current = !!prefs.previewFirst
    setPreviewFirstState(!!prefs.previewFirst)
  }, [])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== SETS_KEY) return
      const next = loadSets()
      setsRef.current = next
      setSets(next)
      if (activeSetRef.current) {
        const refreshed = next.find((s) => s.id === activeSetRef.current!.id) ?? null
        activeSetRef.current = refreshed
        setActiveSetState(refreshed)
      }
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  const setUiMode = useCallback((m: UiMode) => {
    setUiModeState(m)
    saveUiMode(m)
  }, [])

  const applyLock = useCallback((on: boolean) => {
    lockedRef.current = on
    setLockedState(on)
    saveLock(on)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(lyricsChannelName(), {
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
  }, [applyLock])

  const pushSettings = useCallback((next: LyricsSettings) => {
    settingsRef.current = next
    setSettings(next)
    saveSettings(next)
    channelRef.current?.send({ type: "broadcast", event: "settings", payload: next })
  }, [])

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

  // ---- sets

  const createSet = useCallback(
    (title: string, type: ContentType, raw: string, opts?: { pairTranslation?: boolean }): LyricSet | null => {
      const groups = splitContent(raw, type, opts)
      if (!groups.length) return null
      const set: LyricSet = {
        id: newSetId(),
        type,
        title: title.trim() || (type === "prayer" ? "Untitled prayer set" : "Untitled song"),
        groups,
        updatedAt: Date.now(),
      }
      const next = upsertSet(setsRef.current, set)
      setsRef.current = next
      setSets(next)
      selectSet(set.id)
      return set
    },
    [selectSet]
  )

  const deleteSet = useCallback((id: string) => {
    const next = removeSet(setsRef.current, id)
    setsRef.current = next
    setSets(next)
    if (activeSetRef.current?.id === id) {
      stopAuto()
      activeSetRef.current = null
      setActiveSetState(null)
      activeIndexRef.current = 0
      setActiveIndexState(0)
    }
  }, [stopAuto])

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
    createSet,
    deleteSet,
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
