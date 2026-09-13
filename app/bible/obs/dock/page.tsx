"use client"

/**
 * OBS Custom Browser Dock — /bible/obs/dock
 *
 * Add this as a Custom Browser Dock inside OBS Studio so the operator
 * can control the Bible overlay without leaving OBS.
 *
 * OBS Setup:
 *   1. View → Docks → Custom Browser Docks
 *   2. Dock Name: Bible Control
 *   3. URL: https://<your-domain>/bible/obs/dock
 *   4. Click Apply — dock appears as a panel inside OBS
 *
 * The dock broadcasts to the same Supabase Realtime channel as the
 * Bible Reader, so every OBS surface updates instantly. It is also the
 * source of truth for the scene's appearance settings.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { detectBibleReferences } from "@/lib/bible/detect-references"
import { fetchBiblePassage, TRANSLATIONS, type TranslationId } from "@/lib/bible/fetch-passage"
import { verseLabel } from "@/lib/bible/format"
import {
  SCENE_DEFAULTS,
  loadSettings,
  saveSettings,
  type SceneSettings,
} from "@/lib/bible/scene-settings"

const OBS_CHANNEL = "bible-obs"

interface Verse {
  book?: string
  chapter?: number
  verse: number
  text: string
}

interface PassagePayload {
  reference: string
  text: string
  translation: string
  translationName: string
  verseNumber?: number
  verses?: Verse[]
}

const BookIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
)

const GearIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)

export default function BibleObsDockPage() {
  const [query, setQuery] = useState("")
  const [translation, setTranslation] = useState<TranslationId>("kjv")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [onScreen, setOnScreen] = useState<PassagePayload | null>(null)
  const [view, setView] = useState<"bible" | "settings">("bible")
  const [settings, setSettings] = useState<SceneSettings>(SCENE_DEFAULTS)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null)
  const activeVerseRef = useRef<HTMLButtonElement>(null)
  const settingsRef = useRef(settings)
  const onScreenRef = useRef<PassagePayload | null>(null)

  useEffect(() => {
    const stored = loadSettings()
    settingsRef.current = stored
    setSettings(stored)
  }, [])

  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  useEffect(() => {
    onScreenRef.current = onScreen
  }, [onScreen])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(OBS_CHANNEL, {
      config: { broadcast: { self: true } },
    })
    channel
      .on("broadcast", { event: "passage" }, ({ payload }: { payload: PassagePayload }) => {
        setOnScreen(payload)
      })
      .on("broadcast", { event: "clear" }, () => {
        setOnScreen(null)
      })
      // A source that loads later (OBS scene switch, restart) asks for what is
      // already live so it renders the current verse instead of coming back blank.
      .on("broadcast", { event: "request-state" }, () => {
        channel.send({ type: "broadcast", event: "settings", payload: settingsRef.current })
        if (onScreenRef.current) {
          channel.send({ type: "broadcast", event: "passage", payload: onScreenRef.current })
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

  const update = useCallback(
    <K extends keyof SceneSettings>(key: K, value: SceneSettings[K]) => {
      pushSettings({ ...settingsRef.current, [key]: value })
    },
    [pushSettings]
  )

  const broadcast = useCallback((payload: PassagePayload) => {
    channelRef.current?.send({ type: "broadcast", event: "passage", payload })
    setOnScreen(payload)
  }, [])

  const clearScreen = useCallback(() => {
    channelRef.current?.send({ type: "broadcast", event: "clear", payload: {} })
    setOnScreen(null)
  }, [])

  const sendRef = useCallback(async (ref: string) => {
    setIsLoading(true)
    setError(null)
    try {
      const apiPath = ref.toLowerCase().replace(/\s+/g, "+")
      const passage = await fetchBiblePassage(apiPath, translation)
      broadcast({
        reference: passage.reference,
        text: passage.text,
        translation: passage.translationId,
        translationName: passage.translationName,
        verses: passage.verses,
        verseNumber: passage.verses.length === 1 ? passage.verses[0]?.verse : undefined,
      })
    } catch {
      setError("Not found — check the reference")
    } finally {
      setIsLoading(false)
    }
  }, [translation, broadcast])

  const sendVerse = useCallback((v: Verse) => {
    setOnScreen((current) => {
      if (!current) return current
      const payload: PassagePayload = { ...current, text: v.text, verseNumber: v.verse }
      channelRef.current?.send({ type: "broadcast", event: "passage", payload })
      return payload
    })
  }, [])

  const verses = onScreen?.verses ?? []
  const activeIndex = useMemo(
    () => verses.findIndex((v) => v.verse === onScreen?.verseNumber),
    [verses, onScreen?.verseNumber]
  )

  const step = useCallback(
    (delta: number) => {
      if (!verses.length) return
      const next = activeIndex < 0 ? (delta > 0 ? 0 : verses.length - 1) : activeIndex + delta
      if (next < 0 || next >= verses.length) return
      sendVerse(verses[next])
    },
    [verses, activeIndex, sendVerse]
  )

  useEffect(() => {
    activeVerseRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [onScreen?.verseNumber])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA")) return
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); step(1) }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); step(-1) }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [step])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    setQuery("")
    const detected = detectBibleReferences(q)
    await sendRef(detected.length > 0 ? detected[0].reference : q)
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body {
          background: #16161e;
          color: #e0dff5;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 13px;
          height: 100%;
          overflow: hidden;
        }
        .dock { display: flex; flex-direction: column; height: 100vh; padding: 10px; gap: 9px; }
        .pane { display: flex; flex-direction: column; flex: 1; gap: 9px; min-height: 0; }
        .section-label {
          font-size: 10px; font-weight: 700; letter-spacing: 0.08em;
          text-transform: uppercase; color: #6e6a92;
        }
        .input-row { display: flex; gap: 6px; }
        input[type="text"] {
          flex: 1; min-width: 0;
          background: #1e1e2e; border: 1px solid #313244; border-radius: 6px;
          color: #cdd6f4; font-size: 13px; padding: 7px 10px; outline: none;
          transition: border-color 0.15s;
        }
        input[type="text"]:focus { border-color: #7c6af7; }
        input[type="text"]::placeholder { color: #585878; }
        select {
          background: #1e1e2e; border: 1px solid #313244; border-radius: 6px;
          color: #cdd6f4; font-size: 12px; padding: 6px 8px; outline: none;
          cursor: pointer; width: 100%;
        }
        select:focus { border-color: #7c6af7; }
        select.compact { width: auto; font-size: 11.5px; padding: 4px 6px; }
        button {
          border: none; border-radius: 6px; cursor: pointer;
          font-size: 13px; font-weight: 600; padding: 7px 14px;
          transition: opacity 0.15s, background 0.15s;
        }
        button:disabled { opacity: 0.45; cursor: not-allowed; }
        .btn-primary { background: #7c6af7; color: #fff; white-space: nowrap; }
        .btn-primary:hover:not(:disabled) { background: #6d5ce6; }
        .btn-clear {
          background: #2d2d3f; color: #f38ba8; border: 1px solid #3d3d55;
          width: 100%; padding: 6px; font-size: 12px;
        }
        .btn-clear:hover:not(:disabled) { background: #3d2d3a; }

        /* Verse navigator */
        .verse-section { display: flex; flex-direction: column; flex: 1; min-height: 0; }
        .verse-head {
          display: flex; align-items: center; justify-content: space-between;
          gap: 6px; margin-bottom: 5px;
        }
        .nav-group { display: flex; gap: 4px; }
        .nav-btn {
          background: #1e1e2e; border: 1px solid #313244; border-radius: 5px;
          color: #a6adc8; font-size: 13px; font-weight: 700; line-height: 1; padding: 4px 9px;
        }
        .nav-btn:hover:not(:disabled) { background: #2a2a3e; border-color: #7c6af7; color: #fff; }
        .verse-list {
          flex: 1; overflow-y: auto; min-height: 0;
          border: 1px solid #252535; border-radius: 6px; padding: 5px;
          display: flex; flex-direction: column; gap: 4px;
        }
        .verse-list::-webkit-scrollbar, .settings::-webkit-scrollbar { width: 8px; }
        .verse-list::-webkit-scrollbar-thumb, .settings::-webkit-scrollbar-thumb {
          background: #313244; border-radius: 4px;
        }
        .verse-item {
          background: #1a1a28; border: 1px solid transparent; border-radius: 5px;
          color: #a6adc8; display: flex; gap: 8px; width: 100%;
          font-size: 11.5px; font-weight: 400; line-height: 1.5;
          padding: 7px 8px; text-align: left;
          transition: background 0.1s, border-color 0.1s, color 0.1s;
        }
        .verse-item:hover { background: #232336; border-color: #3d3d55; color: #cdd6f4; }
        .verse-item.active { background: #2a2040; border-color: #7c6af7; color: #eae4ff; }
        .verse-num {
          color: #7c6af7; flex-shrink: 0; font-family: monospace;
          font-size: 10.5px; font-weight: 700; padding-top: 1px; min-width: 26px;
        }
        .verse-item.active .verse-num { color: #b4a8ff; }
        .empty {
          color: #444460; font-size: 12px; text-align: center; padding: 14px 0;
          border: 1px dashed #2d2d45; border-radius: 6px;
        }
        .error-msg { color: #f38ba8; font-size: 11px; }
        .divider { height: 1px; background: #252535; }

        /* Settings */
        .settings {
          flex: 1; min-height: 0; overflow-y: auto;
          display: flex; flex-direction: column; gap: 9px; padding-right: 2px;
        }
        .srow { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .srow > span { color: #a6adc8; font-size: 11.5px; }
        .ctl { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
        input[type="color"] {
          -webkit-appearance: none; appearance: none;
          background: none; border: 1px solid #313244; border-radius: 4px;
          cursor: pointer; height: 24px; width: 34px; padding: 2px;
        }
        input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
        input[type="color"]::-webkit-color-swatch { border: none; border-radius: 2px; }
        input[type="range"] { accent-color: #7c6af7; cursor: pointer; width: 88px; }
        input[type="checkbox"] { accent-color: #7c6af7; cursor: pointer; height: 15px; width: 15px; }
        .val {
          color: #6e6a92; font-family: monospace; font-size: 10.5px;
          min-width: 32px; text-align: right;
        }
        .btn-reset {
          background: #1e1e2e; border: 1px solid #313244; color: #a6adc8;
          font-size: 11.5px; padding: 6px; width: 100%;
        }
        .btn-reset:hover { background: #2a2a3e; border-color: #7c6af7; color: #cdd6f4; }
        .hint { color: #52526e; font-size: 10.5px; line-height: 1.45; }

        /* Bottom toolbar */
        .toolbar {
          display: flex; gap: 5px; align-items: center;
          border-top: 1px solid #252535; padding-top: 8px;
        }
        .tool-btn {
          background: #1e1e2e; border: 1px solid #313244; border-radius: 5px;
          color: #6e6a92; cursor: pointer; padding: 5px;
          display: flex; align-items: center; justify-content: center;
          height: 28px; width: 30px;
        }
        .tool-btn svg { height: 15px; width: 15px; }
        .tool-btn:hover { background: #2a2a3e; border-color: #3d3d55; color: #cdd6f4; }
        .tool-btn.active { background: #2a2040; border-color: #7c6af7; color: #b4a8ff; }
        .spinner {
          display: inline-block; width: 12px; height: 12px;
          border: 2px solid rgba(255,255,255,0.25); border-top-color: #fff;
          border-radius: 50%; animation: spin 0.6s linear infinite;
          vertical-align: middle; margin-right: 4px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="dock">
        {view === "bible" ? (
          <div className="pane">
            <form onSubmit={handleSubmit} className="input-row">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. John 3:16"
                disabled={isLoading}
                autoComplete="off"
                spellCheck={false}
              />
              <button type="submit" className="btn-primary" disabled={isLoading || !query.trim()}>
                {isLoading ? <span className="spinner" /> : null}
                Send
              </button>
            </form>
            {error && <div className="error-msg">{error}</div>}

            <select value={translation} onChange={(e) => setTranslation(e.target.value as TranslationId)}>
              {TRANSLATIONS.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>

            <div className="divider" />

            <div className="verse-section">
              <div className="verse-head">
                <span className="section-label">{onScreen ? onScreen.reference : "Verses"}</span>
                <div className="nav-group">
                  <button
                    className="nav-btn"
                    onClick={() => step(-1)}
                    disabled={!verses.length || activeIndex <= 0}
                    title="Previous verse (←)"
                  >
                    ←
                  </button>
                  <button
                    className="nav-btn"
                    onClick={() => step(1)}
                    disabled={!verses.length || activeIndex >= verses.length - 1}
                    title="Next verse (→)"
                  >
                    →
                  </button>
                </div>
              </div>

              {verses.length > 0 ? (
                <div className="verse-list">
                  {verses.map((v) => {
                    const active = onScreen?.verseNumber === v.verse
                    return (
                      <button
                        key={v.verse}
                        ref={active ? activeVerseRef : undefined}
                        className={`verse-item${active ? " active" : ""}`}
                        onClick={() => sendVerse(v)}
                      >
                        <span className="verse-num">{verseLabel(v)}</span>
                        <span>{v.text}</span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="empty">Nothing on screen</div>
              )}
            </div>

            {onScreen && (
              <button className="btn-clear" onClick={clearScreen}>
                Clear Screen
              </button>
            )}
          </div>
        ) : (
          <div className="pane">
            <span className="section-label">Scene Appearance</span>
            <div className="settings">
              <div className="srow">
                <span>Background</span>
                <div className="ctl">
                  <input
                    type="color"
                    value={settings.bgColor}
                    onChange={(e) => update("bgColor", e.target.value)}
                  />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(settings.bgOpacity * 100)}
                    onChange={(e) => update("bgOpacity", Number(e.target.value) / 100)}
                  />
                  <span className="val">{Math.round(settings.bgOpacity * 100)}%</span>
                </div>
              </div>
              <div className="hint">0% is fully transparent, so your scene background shows through.</div>

              <div className="srow">
                <span>Text position</span>
                <select
                  className="compact"
                  value={settings.pos}
                  onChange={(e) => update("pos", e.target.value as SceneSettings["pos"])}
                >
                  <option value="top">Top</option>
                  <option value="center">Centre</option>
                  <option value="bottom">Bottom</option>
                </select>
              </div>

              <div className="srow">
                <span>Text size</span>
                <div className="ctl">
                  <input
                    type="range"
                    min={50}
                    max={150}
                    step={5}
                    value={Math.round(settings.scale * 100)}
                    onChange={(e) => update("scale", Number(e.target.value) / 100)}
                  />
                  <span className="val">{Math.round(settings.scale * 100)}%</span>
                </div>
              </div>

              <div className="srow">
                <span>Reference</span>
                <select
                  className="compact"
                  value={settings.refPos}
                  onChange={(e) => update("refPos", e.target.value as SceneSettings["refPos"])}
                >
                  <option value="top">Above text</option>
                  <option value="bottom">Below text</option>
                  <option value="hide">Hidden</option>
                </select>
              </div>

              <div className="srow">
                <span>Font</span>
                <select
                  className="compact"
                  value={settings.serif ? "serif" : "sans"}
                  onChange={(e) => update("serif", e.target.value === "serif")}
                >
                  <option value="serif">Serif</option>
                  <option value="sans">Sans</option>
                </select>
              </div>

              <div className="srow">
                <span>Text colour</span>
                <input
                  type="color"
                  value={settings.color}
                  onChange={(e) => update("color", e.target.value)}
                />
              </div>

              <div className="srow">
                <span>Reference colour</span>
                <input
                  type="color"
                  value={settings.accent}
                  onChange={(e) => update("accent", e.target.value)}
                />
              </div>

              <div className="srow">
                <span>Drop shadow</span>
                <input
                  type="checkbox"
                  checked={settings.shadow}
                  onChange={(e) => update("shadow", e.target.checked)}
                />
              </div>

              <div className="srow">
                <span>Show translation</span>
                <input
                  type="checkbox"
                  checked={settings.showTranslation}
                  onChange={(e) => update("showTranslation", e.target.checked)}
                />
              </div>

              <div className="srow">
                <span>Inline verse number</span>
                <input
                  type="checkbox"
                  checked={settings.inlineNumber}
                  onChange={(e) => update("inlineNumber", e.target.checked)}
                />
              </div>
              <div className="hint">Puts the number in front of the text, like ³ And God said…</div>

              <div className="divider" />
              <button className="btn-reset" onClick={() => pushSettings(SCENE_DEFAULTS)}>
                Reset to defaults
              </button>
            </div>
          </div>
        )}

        <div className="toolbar">
          <button
            className={`tool-btn${view === "bible" ? " active" : ""}`}
            onClick={() => setView("bible")}
            title="Bible"
          >
            <BookIcon />
          </button>
          <button
            className={`tool-btn${view === "settings" ? " active" : ""}`}
            onClick={() => setView("settings")}
            title="Scene appearance settings"
          >
            <GearIcon />
          </button>
        </div>
      </div>
    </>
  )
}
