"use client"

/**
 * All of the OBS dock's state and actions in one hook, so the UI pieces stay
 * small. Loading goes through the passage store (cache, de-dup, prefetch);
 * what is on screen is whatever the display reports back.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { FetchedPassage, TranslationId } from "@/lib/bible/fetch-passage"
import { loadPassage, prefetchTranslationsWhenIdle, PassageUnavailableError } from "@/lib/bible/passage-store"
import { normalizeReference, rangeReference, verseId } from "@/lib/bible/format"
import { rangeOrderedSelection, singleVerseChapterRequest, toggleOrderedSelection } from "@/lib/bible/selection"
import { obsChannelName } from "@/lib/bible/obs-channel"
import { loadLock, saveLock, type LockPayload } from "@/lib/bible/obs-lock"
import { SCENE_DEFAULTS, loadSettings, saveSettings, type SceneSettings } from "@/lib/bible/scene-settings"
import { bookFromApiName, nextBook, nextChapter, prevBook, prevChapter, type BookInfo } from "@/lib/bible/books"
import {
  EMPTY_LISTS,
  clearRecent as clearRecentList,
  enqueue as enqueueItem,
  isFavourite as isFav,
  loadLists,
  moveQueued as moveQueuedItem,
  pushRecent,
  removeQueued,
  saveLists,
  toggleFavourite as toggleFav,
  type DockLists,
} from "@/lib/bible/dock-lists"
import type { DisplayState } from "@/components/bible/obs-surface"

export interface Verse {
  book?: string
  chapter?: number
  verse: number
  text: string
}

export interface PassagePayload {
  reference: string
  text: string
  translation: string
  translationName: string
  verseNumber?: number
  focusId?: string
  /** Anchor used by Shift-click range selection in the dock. */
  selectionAnchorId?: string
  verses?: Verse[]
  /** Full loaded chapter for the dock picker. OBS only receives/renders `verses`. */
  availableVerses?: Verse[]
  /** Replaying what is already live (scene switch, reconnect) rather than changing it. */
  restore?: boolean
}

/** Something the operator can send: what to ask the API for, and how to label it. */
export interface Target {
  apiPath: string
  reference: string
}

export interface Position {
  book: BookInfo
  chapter: number
  verse: number
}

const PREFS_KEY = "bible-dock-prefs"
const UI_MODE_KEY = "bible-dock-ui-mode"
const UNDO_DEPTH = 10

/**
 * Simple/Advanced is presentation only — which controls are shown, never which
 * behaviour runs. Every action below stays reachable in both; this just decides
 * what the toolbar and Settings surface by default. Simple is the default so a
 * first-time operator isn't confronted with the full toolset mid-service.
 */
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
    // non-fatal: the choice still applies for this session
  }
}

interface Prefs {
  translation?: TranslationId
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

/** Payload focused on one verse by stable id; verseNumber rides along for the projection screen. */
export function withFocus(p: PassagePayload, id: string | undefined): PassagePayload {
  const v = id ? p.verses?.find((x) => verseId(x) === id) : undefined
  return { ...p, focusId: v ? id : undefined, verseNumber: v?.verse }
}

function toPayload(p: FetchedPassage, target?: Target, selectedOverride?: Verse[]): PassagePayload {
  const chapterOnly = !!target && !target.reference.includes(":") && p.verses.length > 3
  const selected = selectedOverride ?? (chapterOnly ? p.verses.slice(0, 3) : p.verses)
  return {
    reference: selectedOverride ? rangeReference(selectedOverride) ?? target?.reference ?? p.reference : p.reference,
    text: selected.map((v) => v.text).join(" "),
    translation: p.translationId,
    translationName: p.translationName,
    // Critical safety: the display payload itself contains only selected verses.
    // The full chapter is retained separately for the dock picker.
    verses: selected,
    availableVerses: p.verses,
    selectionAnchorId: selected[0] ? verseId(selected[0]) : undefined,
  }
}

/** "Psalms 23" → "psalms+23": what the API wants, from a reference we were handed. */
export function targetFromReference(reference: string): Target {
  return { reference, apiPath: reference.trim().toLowerCase().replace(/[–—]/g, "-").replace(/\s+/g, "+") }
}

export function chapterTarget(book: BookInfo, chapter: number): Target {
  return { apiPath: `${book.canonical}+${chapter}`, reference: `${book.name} ${chapter}` }
}

export function verseTarget(book: BookInfo, chapter: number, verse: number, endVerse?: number): Target {
  if (endVerse != null && endVerse !== verse) {
    return { apiPath: `${book.canonical}+${chapter}:${verse}-${endVerse}`, reference: `${book.name} ${chapter}:${verse}–${endVerse}` }
  }
  return { apiPath: `${book.canonical}+${chapter}:${verse}`, reference: `${book.name} ${chapter}:${verse}` }
}

export function useDock(channelScope: string) {
  const [translation, setTranslationState] = useState<TranslationId>("kjv")
  const [onScreen, setOnScreen] = useState<PassagePayload | null>(null)
  const [shown, setShown] = useState<DisplayState | null>(null)
  const [focus, setFocus] = useState<string | null>(null)
  const [settings, setSettings] = useState<SceneSettings>(SCENE_DEFAULTS)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lists, setLists] = useState<DockLists>(EMPTY_LISTS)
  const [locked, setLockedState] = useState(false)
  const [canUndo, setCanUndo] = useState(false)
  const [previewFirst, setPreviewFirstState] = useState(false)
  const [staged, setStaged] = useState<PassagePayload | null>(null)
  const [uiMode, setUiModeState] = useState<UiMode>("simple")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase Realtime's channel event payloads are not typed as a discriminated union in this client API.
  const channelRef = useRef<any>(null)
  const translationRef = useRef<TranslationId>("kjv")
  const settingsRef = useRef(settings)
  const onScreenRef = useRef<PassagePayload | null>(null)
  const selectionAnchorRef = useRef<string | null>(null)
  const shownRef = useRef<DisplayState | null>(null)
  // Tracked apart, so changing translation reloads the right one rather than
  // whichever happened to be fetched last.
  const liveTargetRef = useRef<Target | null>(null)
  const stagedTargetRef = useRef<Target | null>(null)
  const lockedRef = useRef(false)
  const previewFirstRef = useRef(false)
  const stagedRef = useRef<PassagePayload | null>(null)
  /** Live states before each change; null means the screen was clear. */
  const undoRef = useRef<Array<PassagePayload | null>>([])

  useEffect(() => {
    const stored = loadSettings()
    settingsRef.current = stored
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydrate browser-persisted preferences after mount to avoid reading localStorage during server rendering.
    setSettings(stored)
    const prefs = loadPrefs()
    if (prefs.translation) {
      translationRef.current = prefs.translation
      setTranslationState(prefs.translation)
    }
    previewFirstRef.current = !!prefs.previewFirst
    setPreviewFirstState(!!prefs.previewFirst)
    setLists(loadLists())
    const wasLocked = loadLock()
    lockedRef.current = wasLocked
    setLockedState(wasLocked)
    setUiModeState(loadUiMode())
  }, [])

  const setUiMode = useCallback((m: UiMode) => {
    setUiModeState(m)
    saveUiMode(m)
  }, [])

  useEffect(() => {
    settingsRef.current = settings
  }, [settings])
  useEffect(() => {
    onScreenRef.current = onScreen
  }, [onScreen])
  useEffect(() => {
    shownRef.current = shown
  }, [shown])
  useEffect(() => {
    stagedRef.current = staged
  }, [staged])

  const applyLock = useCallback((on: boolean) => {
    lockedRef.current = on
    setLockedState(on)
    saveLock(on)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(obsChannelName(channelScope), {
      config: { broadcast: { self: true } },
    })
    channel
      // The display refuses scripture changes while locked, so this mirror must too —
      // otherwise the dock drifts away from the stream and restores the wrong thing.
      .on("broadcast", { event: "passage" }, ({ payload }: { payload: PassagePayload }) => {
        if (lockedRef.current && !payload.restore) return
        onScreenRef.current = payload
        selectionAnchorRef.current = payload.selectionAnchorId ?? payload.focusId ?? (payload.verses?.[0] ? verseId(payload.verses[0]) : null)
        setOnScreen(payload)
      })
      .on("broadcast", { event: "clear" }, () => {
        if (lockedRef.current) return
        onScreenRef.current = null
        selectionAnchorRef.current = null
        shownRef.current = null
        setOnScreen(null)
        setShown(null)
        setFocus(null)
      })
      .on("broadcast", { event: "display-state" }, ({ payload }: { payload: DisplayState }) => {
        shownRef.current = payload
        setShown(payload)
      })
      // A display that loads later (OBS scene switch, restart) asks for what is
      // already live so it renders the current verse instead of coming back blank.
      .on("broadcast", { event: "request-state" }, () => {
        channel.send({ type: "broadcast", event: "settings", payload: settingsRef.current })
        channel.send({ type: "broadcast", event: "lock", payload: { locked: lockedRef.current } })
        const cur = onScreenRef.current
        if (cur) {
          channel.send({
            type: "broadcast",
            event: "passage",
            // Marked as a restore so a locked display replays it instead of refusing it.
            payload: { ...withFocus(cur, shownRef.current?.from ?? cur.focusId), restore: true },
          })
        }
      })
      // Another dock changed the lock, or the display reported where it stands.
      .on("broadcast", { event: "lock" }, ({ payload }: { payload: LockPayload }) => {
        applyLock(!!payload?.locked)
      })
      .on("broadcast", { event: "lock-state" }, ({ payload }: { payload: LockPayload }) => {
        applyLock(!!payload?.locked)
      })
      .subscribe((status: string) => {
        // A dock opened after the display needs to know whether the stream is locked.
        if (status === "SUBSCRIBED") {
          channel.send({ type: "broadcast", event: "request-lock", payload: {} })
        }
      })
    channelRef.current = channel
    return () => {
      channel.unsubscribe()
    }
  }, [applyLock, channelScope])

  const updateLists = useCallback((fn: (l: DockLists) => DockLists) => {
    setLists((prev) => {
      const next = fn(prev)
      if (next !== prev) saveLists(next)
      return next
    })
  }, [])

  const pushSettings = useCallback((next: SceneSettings) => {
    settingsRef.current = next
    setSettings(next)
    saveSettings(next)
    channelRef.current?.send({ type: "broadcast", event: "settings", payload: next })
  }, [])

  const updateSetting = useCallback(
    <K extends keyof SceneSettings>(key: K, value: SceneSettings[K]) => {
      pushSettings({ ...settingsRef.current, [key]: value })
    },
    [pushSettings]
  )

  /** Remember the live state so Undo can bring it back. */
  const remember = useCallback(() => {
    const cur = onScreenRef.current
    const snapshot = cur ? withFocus(cur, shownRef.current?.from ?? cur.focusId) : null
    undoRef.current = [...undoRef.current.slice(-(UNDO_DEPTH - 1)), snapshot]
    setCanUndo(true)
  }, [])

  const broadcast = useCallback(
    (payload: PassagePayload, opts?: { remember?: boolean }) => {
      if (opts?.remember !== false) remember()
      // Keep the imperative action source in step immediately. Verse clicks can
      // arrive before React runs the effect below; reading the previous passage
      // there made a quick second selection overwrite the first one.
      onScreenRef.current = payload
      shownRef.current = null
      channelRef.current?.send({ type: "broadcast", event: "passage", payload })
      setOnScreen(payload)
      setShown(null)
      setFocus(payload.focusId ?? null)
    },
    [remember]
  )

  const clear = useCallback(
    (opts?: { remember?: boolean }) => {
      if (lockedRef.current) return
      if (opts?.remember !== false) remember()
      onScreenRef.current = null
      shownRef.current = null
      channelRef.current?.send({ type: "broadcast", event: "clear", payload: {} })
      setOnScreen(null)
      setShown(null)
      setFocus(null)
    },
    [remember]
  )

  const undo = useCallback(() => {
    if (lockedRef.current) return
    const stack = undoRef.current
    if (!stack.length) return
    const prev = stack.pop()!
    setCanUndo(stack.length > 0)
    if (prev) broadcast(prev, { remember: false })
    else clear({ remember: false })
  }, [broadcast, clear])

  /**
   * Put a passage on screen — or, with preview on, into the preview slot.
   * The selected translation is loaded first (from cache when we have it);
   * the others are warmed behind it so switching afterwards is instant.
   * Resolves true when the passage went live.
   */
  const send = useCallback(
    async (target: Target, opts?: { focusId?: string; translation?: TranslationId; live?: boolean }): Promise<boolean> => {
      // The lock protects the stream, not the operator's preparation: with preview
      // on, a locked dock can still stage what's coming next.
      const wouldGoLive = !previewFirstRef.current || !!opts?.live
      if (lockedRef.current && wouldGoLive) return false
      const t = opts?.translation ?? translationRef.current
      setBusy(true)
      setError(null)
      try {
        const singleRequest = singleVerseChapterRequest(target.apiPath)
        const passage = await loadPassage(singleRequest?.chapterPath ?? target.apiPath, t, "high")
        const selectedVerse = singleRequest ? passage.verses.filter((verse) => verse.verse === singleRequest.verse) : undefined
        if (singleRequest && selectedVerse?.length !== 1) throw new Error("Verse not found in its chapter")
        const payload = withFocus(
          toPayload(passage, target, selectedVerse),
          opts?.focusId ?? (selectedVerse?.[0] ? verseId(selectedVerse[0]) : passage.verses[0] ? verseId(passage.verses[0]) : undefined)
        )
        payload.selectionAnchorId = payload.focusId
        const loaded = { apiPath: target.apiPath, reference: payload.reference }
        prefetchTranslationsWhenIdle(target.apiPath, t, passage.verses.length)
        if (previewFirstRef.current && !opts?.live) {
          stagedTargetRef.current = loaded
          setStaged(payload)
          return false
        }
        liveTargetRef.current = loaded
        broadcast(payload)
        updateLists((l) => pushRecent(l, { apiPath: target.apiPath, reference: passage.reference }))
        return true
      } catch (e) {
        setError(e instanceof PassageUnavailableError ? e.message : "Not found — check the reference")
        return false
      } finally {
        setBusy(false)
      }
    },
    [broadcast, updateLists]
  )

  const goLive = useCallback(() => {
    const s = stagedRef.current
    if (!s || lockedRef.current) return
    broadcast(s)
    const target = stagedTargetRef.current ?? targetFromReference(s.reference)
    liveTargetRef.current = target
    stagedTargetRef.current = null
    updateLists((l) => pushRecent(l, { apiPath: target.apiPath, reference: s.reference }))
    setStaged(null)
  }, [broadcast, updateLists])

  const discardStaged = useCallback(() => {
    stagedTargetRef.current = null
    setStaged(null)
  }, [])

  const setPreviewFirst = useCallback((on: boolean) => {
    previewFirstRef.current = on
    setPreviewFirstState(on)
    savePrefs({ previewFirst: on })
    if (!on) {
      stagedTargetRef.current = null
      setStaged(null)
    }
  }, [])

  /** The display enforces this, so every client on the channel is held to it. */
  const setLocked = useCallback(
    (on: boolean) => {
      applyLock(on)
      channelRef.current?.send({ type: "broadcast", event: "lock", payload: { locked: on } })
    },
    [applyLock]
  )

  /**
   * Re-load in another translation, keeping the same verse or page in view.
   * Live stays live and staged stays staged: with preview on, changing
   * translation must never pull a passage off the stream into the preview.
   */
  const changeTranslation = useCallback(
    (t: TranslationId) => {
      translationRef.current = t
      setTranslationState(t)
      savePrefs({ translation: t })

      const stagedNow = stagedRef.current
      // While locked the live passage is left alone, but the preview is still the
      // operator's to prepare.
      const liveNow = lockedRef.current ? null : onScreenRef.current
      if (!stagedNow && !liveNow) return

      void (async () => {
        if (stagedNow) {
          const target = stagedTargetRef.current ?? targetFromReference(stagedNow.reference)
          await send(target, { translation: t, focusId: stagedNow.focusId })
        }
        if (liveNow) {
          const target = liveTargetRef.current ?? targetFromReference(liveNow.reference)
          await send(target, { translation: t, focusId: shownRef.current?.from ?? liveNow.focusId, live: true })
        }
      })()
    },
    [send]
  )

  const selectVerse = useCallback(
    (v: Verse, extend = false) => {
      const cur = onScreenRef.current
      if (!cur || lockedRef.current) return
      const all = cur.availableVerses ?? cur.verses ?? []
      const selected = cur.verses ?? []
      const anchorId = cur.selectionAnchorId ?? selectionAnchorRef.current
      const anchor = extend && anchorId ? all.find((item) => verseId(item) === anchorId) : undefined
      const next = (anchor && extend ? rangeOrderedSelection(all, anchor, v, verseId) : null) ?? toggleOrderedSelection(all, selected, v, verseId)
      if (!next) return
      const nextAnchorId = extend && anchor ? anchorId ?? verseId(v) : verseId(v)
      selectionAnchorRef.current = nextAnchorId
      const nextFocus = next.some((x) => verseId(x) === (cur.focusId ?? "")) ? cur.focusId : verseId(next[0])
      const indices = next.map((item) => all.findIndex((candidate) => verseId(candidate) === verseId(item)))
      const contiguous = indices.every((index, i) => index >= 0 && (i === 0 || index === indices[i - 1] + 1))
      const reference = contiguous ? rangeReference(next) : null
      if (reference) liveTargetRef.current = targetFromReference(reference)
      else liveTargetRef.current = null
      broadcast(withFocus({
        ...cur,
        ...(reference ? { reference } : {}),
        verses: next,
        text: next.map((x) => x.text).join(" "),
        selectionAnchorId: nextAnchorId,
      }, nextFocus))
    },
    [broadcast]
  )

  const nav = useCallback((delta: number) => {
    if (!onScreenRef.current || lockedRef.current) return
    channelRef.current?.send({ type: "broadcast", event: "nav", payload: { delta } })
  }, [])

  const verses = onScreen?.availableVerses ?? onScreen?.verses ?? []

  /** Where we are, from the first verse the display says is showing. */
  const position = useMemo<Position | null>(() => {
    const id = shown?.from ?? onScreen?.focusId
    const v = (id ? verses.find((x) => verseId(x) === id) : undefined) ?? verses[0]
    if (!v?.book || v.chapter == null) return null
    const book = bookFromApiName(v.book)
    return book ? { book, chapter: v.chapter, verse: v.verse } : null
  }, [shown, onScreen, verses])

  const goChapter = useCallback(
    (delta: 1 | -1) => {
      if (!position) return
      const next = delta > 0 ? nextChapter(position.book, position.chapter) : prevChapter(position.book, position.chapter)
      if (next) void send(chapterTarget(next.book, next.chapter))
    },
    [position, send]
  )

  const goBook = useCallback(
    (delta: 1 | -1) => {
      if (!position) return
      const next = delta > 0 ? nextBook(position.book) : prevBook(position.book)
      if (next) void send(chapterTarget(next, 1))
    },
    [position, send]
  )

  // ---- lists

  const currentTarget = useCallback((): Target | null => {
    const cur = onScreenRef.current
    if (!cur) return null
    return liveTargetRef.current ?? targetFromReference(cur.reference)
  }, [])

  const sendItem = useCallback((item: Target) => send({ apiPath: item.apiPath, reference: item.reference }), [send])
  const toggleFavourite = useCallback((item: Target) => updateLists((l) => toggleFav(l, item)), [updateLists])
  const isFavourite = useCallback((apiPath: string) => isFav(lists, apiPath), [lists])
  const favouriteCurrent = useCallback(() => {
    const t = currentTarget()
    if (t) toggleFavourite(t)
  }, [currentTarget, toggleFavourite])
  const enqueue = useCallback((item: Target) => updateLists((l) => enqueueItem(l, item)), [updateLists])
  const queueCurrent = useCallback(() => {
    const t = currentTarget()
    if (t) enqueue(t)
  }, [currentTarget, enqueue])
  const dequeue = useCallback((i: number) => updateLists((l) => removeQueued(l, i)), [updateLists])
  const moveQueued = useCallback((i: number, d: -1 | 1) => updateLists((l) => moveQueuedItem(l, i, d)), [updateLists])
  const clearRecent = useCallback(() => updateLists(clearRecentList), [updateLists])
  const sendQueued = useCallback(
    async (i: number) => {
      const item = lists.queue[i]
      if (!item) return
      const ok = await send(item)
      // With preview on, the item is staged rather than live; keep it queued until it goes live? No —
      // the operator has taken it up, so it leaves the queue either way.
      if (ok || previewFirstRef.current) dequeue(i)
    },
    [lists.queue, send, dequeue]
  )

  // ← → verse · Shift+← → chapter · Alt+← → book · Enter goes live from preview, never while typing
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return
      if (e.key === "Enter" && stagedRef.current) {
        e.preventDefault()
        goLive()
        return
      }
      const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0
      if (!dir) return
      e.preventDefault()
      if (e.altKey) goBook(dir)
      else if (e.shiftKey) goChapter(dir)
      else nav(dir)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [nav, goChapter, goBook, goLive])

  // The on-screen range is a run of list positions, never a numeric verse range —
  // a page can cross a chapter boundary, where numbers restart.
  const fromIdx = shown ? verses.findIndex((v) => verseId(v) === shown.from) : -1
  const toIdx = shown ? verses.findIndex((v) => verseId(v) === shown.to) : -1
  const isShowing = useCallback(
    (v: Verse, i: number) =>
      shown ? fromIdx >= 0 && toIdx >= 0 && i >= fromIdx && i <= toIdx : focus === verseId(v),
    [shown, fromIdx, toIdx, focus]
  )
  const firstShowingIdx = verses.findIndex(isShowing)

  const canPrev = !locked && verses.length > 1 && (shown ? shown.page > 0 : true)
  const canNext = !locked && verses.length > 1 && (shown ? shown.page < shown.pages - 1 : true)
  // eslint-disable-next-line react-hooks/refs -- This is a read-only lookup for the current stream target; dock actions synchronize the ref when passages change.
  const current = currentTarget()
  /** Whether a send can start at all — locked still allows staging a preview. */
  const canSend = !locked || previewFirst
  /** Locked with preview on: sends land in the preview instead of on the stream. */
  const stagingOnly = locked && previewFirst

  return {
    translation,
    onScreen,
    shown,
    settings,
    busy,
    error,
    verses,
    position,
    heading: onScreen ? normalizeReference(onScreen.reference) : null,
    isShowing,
    firstShowingIdx,
    canPrev,
    canNext,
    send,
    clear,
    selectVerse,
    nav,
    goChapter,
    goBook,
    changeTranslation,
    updateSetting,
    pushSettings,
    // lists
    lists,
    sendItem,
    toggleFavourite,
    isFavourite,
    favouriteCurrent,
    currentIsFavourite: !!current && isFav(lists, current.apiPath),
    enqueue,
    queueCurrent,
    dequeue,
    moveQueued,
    sendQueued,
    clearRecent,
    // live safety
    locked,
    canSend,
    stagingOnly,
    setLocked,
    canUndo,
    undo,
    previewFirst,
    setPreviewFirst,
    staged,
    goLive,
    discardStaged,
    // interface mode
    uiMode,
    setUiMode,
  }
}

export type Dock = ReturnType<typeof useDock>
