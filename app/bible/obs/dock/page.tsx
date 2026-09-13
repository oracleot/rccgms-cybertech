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
 * Bible Reader, so every OBS surface updates instantly.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { detectBibleReferences } from "@/lib/bible/detect-references"
import { fetchBiblePassage, TRANSLATIONS, type TranslationId } from "@/lib/bible/fetch-passage"
import { verseLabel } from "@/lib/bible/format"

const OBS_CHANNEL = "bible-obs"

const QUICK_REFS = [
  "John 3:16",
  "Psalm 23",
  "Romans 8:28",
  "Phil 4:13",
  "1 Cor 13:4",
  "Prov 3:5-6",
]

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

export default function BibleObsDockPage() {
  const [query, setQuery] = useState("")
  const [translation, setTranslation] = useState<TranslationId>("kjv")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [onScreen, setOnScreen] = useState<PassagePayload | null>(null)
  const [flashRef, setFlashRef] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null)
  const activeVerseRef = useRef<HTMLButtonElement>(null)

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
      .subscribe()
    channelRef.current = channel
    return () => {
      channel.unsubscribe()
    }
  }, [])

  const broadcast = useCallback((payload: PassagePayload) => {
    channelRef.current?.send({ type: "broadcast", event: "passage", payload })
    setOnScreen(payload)
    setFlashRef(payload.reference)
    setTimeout(() => setFlashRef(null), 1200)
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

  // Keep the live verse in view as the operator steps through a long passage
  useEffect(() => {
    activeVerseRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [onScreen?.verseNumber])

  // Arrow keys step verses when focus is not in the reference input
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
        .dock {
          display: flex;
          flex-direction: column;
          gap: 9px;
          padding: 10px;
          height: 100vh;
        }
        .section-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #6e6a92;
          margin-bottom: 4px;
        }
        .input-row { display: flex; gap: 6px; }
        input[type="text"] {
          flex: 1;
          background: #1e1e2e;
          border: 1px solid #313244;
          border-radius: 6px;
          color: #cdd6f4;
          font-size: 13px;
          padding: 7px 10px;
          outline: none;
          transition: border-color 0.15s;
          min-width: 0;
        }
        input[type="text"]:focus { border-color: #7c6af7; }
        input[type="text"]::placeholder { color: #585878; }
        select {
          background: #1e1e2e;
          border: 1px solid #313244;
          border-radius: 6px;
          color: #cdd6f4;
          font-size: 12px;
          padding: 7px 8px;
          outline: none;
          cursor: pointer;
          width: 100%;
        }
        select:focus { border-color: #7c6af7; }
        button {
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          padding: 7px 14px;
          transition: opacity 0.15s, background 0.15s;
        }
        button:disabled { opacity: 0.45; cursor: not-allowed; }
        .btn-primary { background: #7c6af7; color: #fff; white-space: nowrap; }
        .btn-primary:hover:not(:disabled) { background: #6d5ce6; }
        .btn-clear {
          background: #2d2d3f;
          color: #f38ba8;
          border: 1px solid #3d3d55;
          width: 100%;
          padding: 6px;
          font-size: 12px;
        }
        .btn-clear:hover:not(:disabled) { background: #3d2d3a; }
        .quick-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; }
        .quick-btn {
          background: #1e1e2e;
          border: 1px solid #313244;
          color: #a6adc8;
          font-size: 11px;
          font-weight: 500;
          padding: 6px 8px;
          text-align: left;
          border-radius: 5px;
          transition: background 0.1s, border-color 0.1s, color 0.1s;
        }
        .quick-btn:hover:not(:disabled) {
          background: #2a2a3e; border-color: #7c6af7; color: #cdd6f4;
        }
        .quick-btn.flash { background: #2a2040; border-color: #7c6af7; color: #b4a8ff; }

        /* Verse navigator */
        .verse-section {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
        }
        .verse-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
          margin-bottom: 5px;
        }
        .nav-group { display: flex; gap: 4px; }
        .nav-btn {
          background: #1e1e2e;
          border: 1px solid #313244;
          border-radius: 5px;
          color: #a6adc8;
          font-size: 13px;
          font-weight: 700;
          line-height: 1;
          padding: 4px 9px;
        }
        .nav-btn:hover:not(:disabled) { background: #2a2a3e; border-color: #7c6af7; color: #fff; }
        .verse-list {
          flex: 1;
          overflow-y: auto;
          border: 1px solid #252535;
          border-radius: 6px;
          padding: 5px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-height: 0;
        }
        .verse-list::-webkit-scrollbar { width: 8px; }
        .verse-list::-webkit-scrollbar-thumb { background: #313244; border-radius: 4px; }
        .verse-item {
          background: #1a1a28;
          border: 1px solid transparent;
          border-radius: 5px;
          color: #a6adc8;
          display: flex;
          gap: 8px;
          font-size: 11.5px;
          font-weight: 400;
          line-height: 1.5;
          padding: 7px 8px;
          text-align: left;
          width: 100%;
          transition: background 0.1s, border-color 0.1s, color 0.1s;
        }
        .verse-item:hover { background: #232336; border-color: #3d3d55; color: #cdd6f4; }
        .verse-item.active {
          background: #2a2040;
          border-color: #7c6af7;
          color: #eae4ff;
        }
        .verse-num {
          color: #7c6af7;
          flex-shrink: 0;
          font-family: monospace;
          font-size: 10.5px;
          font-weight: 700;
          padding-top: 1px;
          min-width: 26px;
        }
        .verse-item.active .verse-num { color: #b4a8ff; }
        .on-screen-box {
          background: #1a1a2e;
          border: 1px solid #7c6af7;
          border-radius: 6px;
          padding: 8px 10px;
        }
        .on-screen-ref { font-size: 12px; font-weight: 700; color: #b4a8ff; }
        .on-screen-empty {
          color: #444460;
          font-size: 12px;
          text-align: center;
          padding: 10px 0;
          border: 1px dashed #2d2d45;
          border-radius: 6px;
        }
        .error-msg { color: #f38ba8; font-size: 11px; padding: 4px 0; }
        .divider { height: 1px; background: #252535; }
        .spinner {
          display: inline-block;
          width: 12px; height: 12px;
          border: 2px solid rgba(255,255,255,0.25);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
          vertical-align: middle;
          margin-right: 4px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="dock">
        {/* Reference input */}
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

        {/* Quick references */}
        <div>
          <div className="section-label">Quick Send</div>
          <div className="quick-grid">
            {QUICK_REFS.map((ref) => (
              <button
                key={ref}
                className={`quick-btn${flashRef === ref ? " flash" : ""}`}
                onClick={() => sendRef(ref)}
                disabled={isLoading}
              >
                {ref}
              </button>
            ))}
          </div>
        </div>

        <div className="divider" />

        {/* Verse navigator — the operator reads and advances from here */}
        <div className="verse-section">
          <div className="verse-head">
            <span className="section-label" style={{ marginBottom: 0 }}>
              {onScreen ? onScreen.reference : "Verses"}
            </span>
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
          ) : onScreen ? (
            <div className="on-screen-box">
              <div className="on-screen-ref">{onScreen.reference}</div>
            </div>
          ) : (
            <div className="on-screen-empty">Nothing on screen</div>
          )}
        </div>

        {onScreen && (
          <button className="btn-clear" onClick={clearScreen}>
            Clear Screen
          </button>
        )}
      </div>
    </>
  )
}
