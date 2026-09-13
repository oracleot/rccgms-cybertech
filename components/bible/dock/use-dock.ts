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
import { normalizeReference, verseId } from "@/lib/bible/format"
import { obsChannelName } from "@/lib/bible/obs-channel"
import { SCENE_DEFAULTS, loadSettings, saveSettings, type SceneSettings } from "@/lib/bible/scene-settings"
import { bookFromApiName, nextBook, nextChapter, prevBook, prevChapter, type BookInfo } from "@/lib/bible/books"
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
  verses?: Verse[]
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

interface Prefs {
  translation?: TranslationId
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

function toPayload(p: FetchedPassage): PassagePayload {
  return {
    reference: p.reference,
    text: p.text,
    translation: p.translationId,
    translationName: p.translationName,
    verses: p.verses,
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

export function useDock() {
  const [translation, setTranslationState] = useState<TranslationId>("kjv")
  const [onScreen, setOnScreen] = useState<PassagePayload | null>(null)
  const [shown, setShown] = useState<DisplayState | null>(null)
  const [focus, setFocus] = useState<string | null>(null)
  const [settings, setSettings] = useState<SceneSettings>(SCENE_DEFAULTS)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null)
  const translationRef = useRef<TranslationId>("kjv")
  const settingsRef = useRef(settings)
  const onScreenRef = useRef<PassagePayload | null>(null)
  const shownRef = useRef<DisplayState | null>(null)
  const lastTargetRef = useRef<Target | null>(null)

  useEffect(() => {
    const stored = loadSettings()
    settingsRef.current = stored
    setSettings(stored)
    const prefs = loadPrefs()
    if (prefs.translation) {
      translationRef.current = prefs.translation
      setTranslationState(prefs.translation)
    }
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
    const supabase = createClient()
    const channel = supabase.channel(obsChannelName(), {
      config: { broadcast: { self: true } },
    })
    channel
      .on("broadcast", { event: "passage" }, ({ payload }: { payload: PassagePayload }) => {
        setOnScreen(payload)
      })
      .on("broadcast", { event: "clear" }, () => {
        setOnScreen(null)
        setShown(null)
        setFocus(null)
      })
      .on("broadcast", { event: "display-state" }, ({ payload }: { payload: DisplayState }) => {
        setShown(payload)
      })
      // A display that loads later (OBS scene switch, restart) asks for what is
      // already live so it renders the current verse instead of coming back blank.
      .on("broadcast", { event: "request-state" }, () => {
        channel.send({ type: "broadcast", event: "settings", payload: settingsRef.current })
        const cur = onScreenRef.current
        if (cur) {
          channel.send({
            type: "broadcast",
            event: "passage",
            payload: withFocus(cur, shownRef.current?.from ?? cur.focusId),
          })
        }
      })
      .subscribe()
    channelRef.current = channel
    return () => {
      channel.unsubscribe()
    }
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

  const broadcast = useCallback((payload: PassagePayload) => {
    channelRef.current?.send({ type: "broadcast", event: "passage", payload })
    setOnScreen(payload)
    setShown(null)
    setFocus(payload.focusId ?? null)
  }, [])

  const clear = useCallback(() => {
    channelRef.current?.send({ type: "broadcast", event: "clear", payload: {} })
    setOnScreen(null)
    setShown(null)
    setFocus(null)
  }, [])

  /**
   * Put a passage on screen. The selected translation is loaded first (from
   * cache when we have it); the others are warmed behind it so switching
   * translation afterwards is instant.
   */
  const send = useCallback(
    async (target: Target, opts?: { focusId?: string; translation?: TranslationId }) => {
      const t = opts?.translation ?? translationRef.current
      setBusy(true)
      setError(null)
      try {
        const passage = await loadPassage(target.apiPath, t, "high")
        const single = passage.verses.length === 1 ? verseId(passage.verses[0]) : undefined
        broadcast(withFocus(toPayload(passage), opts?.focusId ?? single))
        lastTargetRef.current = { apiPath: target.apiPath, reference: passage.reference }
        prefetchTranslationsWhenIdle(target.apiPath, t, passage.verses.length)
      } catch (e) {
        setError(e instanceof PassageUnavailableError ? e.message : "Not found — check the reference")
      } finally {
        setBusy(false)
      }
    },
    [broadcast]
  )

  /** Re-load what is live in another translation, keeping the same verse or page in view. */
  const changeTranslation = useCallback(
    (t: TranslationId) => {
      translationRef.current = t
      setTranslationState(t)
      savePrefs({ translation: t })
      const cur = onScreenRef.current
      if (!cur) return
      const target = lastTargetRef.current ?? targetFromReference(cur.reference)
      void send(target, { translation: t, focusId: shownRef.current?.from ?? cur.focusId })
    },
    [send]
  )

  const selectVerse = useCallback(
    (v: Verse) => {
      const cur = onScreenRef.current
      if (!cur) return
      const id = verseId(v)
      const payload = withFocus(cur, id)
      channelRef.current?.send({ type: "broadcast", event: "passage", payload })
      setOnScreen(payload)
      setShown(null)
      setFocus(id)
    },
    []
  )

  const nav = useCallback((delta: number) => {
    if (!onScreenRef.current) return
    channelRef.current?.send({ type: "broadcast", event: "nav", payload: { delta } })
  }, [])

  const verses = onScreen?.verses ?? []

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

  // ← → verse · Shift+← → chapter · Alt+← → book, never while typing
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return
      const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0
      if (!dir) return
      e.preventDefault()
      if (e.altKey) goBook(dir)
      else if (e.shiftKey) goChapter(dir)
      else nav(dir)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [nav, goChapter, goBook])

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

  const canPrev = verses.length > 1 && (shown ? shown.page > 0 : true)
  const canNext = verses.length > 1 && (shown ? shown.page < shown.pages - 1 : true)

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
  }
}

export type Dock = ReturnType<typeof useDock>
