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
 * Bible Reader (/bible/obs), so the overlay updates instantly.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { detectBibleReferences } from "@/lib/bible/detect-references"
import { fetchBiblePassage, TRANSLATIONS, type TranslationId } from "@/lib/bible/fetch-passage"

const OBS_CHANNEL = "bible-obs"

const QUICK_REFS = [
  "John 3:16",
  "Psalm 23",
  "Romans 8:28",
  "Phil 4:13",
  "1 Cor 13:4",
  "Prov 3:5-6",
]

interface PassagePayload {
  reference: string
  text: string
  translation: string
  translationName: string
  verseNumber?: number
  verses?: Array<{ verse: number; text: string }>
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

  const sendVerse = useCallback((v: { verse: number; text: string }) => {
    if (!onScreen) return
    const payload: PassagePayload = { ...onScreen, text: v.text, verseNumber: v.verse }
    channelRef.current?.send({ type: "broadcast", event: "passage", payload })
    setOnScreen(payload)
    setFlashRef(String(v.verse))
    setTimeout(() => setFlashRef(null), 800)
  }, [onScreen])

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
          overflow-x: hidden;
        }
        .dock {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 10px;
          min-height: 100vh;
        }
        .section-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #6e6a92;
          margin-bottom: 4px;
        }
        .input-row {
          display: flex;
          gap: 6px;
        }
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
        .btn-primary {
          background: #7c6af7;
          color: #fff;
          white-space: nowrap;
        }
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
        .quick-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 5px;
        }
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
          background: #2a2a3e;
          border-color: #7c6af7;
          color: #cdd6f4;
        }
        .quick-btn.flash {
          background: #2a2040;
          border-color: #7c6af7;
          color: #b4a8ff;
        }
        .verse-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }
        .verse-btn {
          background: #1e1e2e;
          border: 1px solid #313244;
          border-radius: 5px;
          color: #a6adc8;
          cursor: pointer;
          font-family: monospace;
          font-size: 12px;
          font-weight: 700;
          min-width: 30px;
          padding: 5px 6px;
          text-align: center;
          transition: background 0.1s, border-color 0.1s, color 0.1s;
        }
        .verse-btn:hover { background: #2a2a3e; border-color: #7c6af7; color: #cdd6f4; }
        .verse-btn.active { background: #7c6af7; border-color: #7c6af7; color: #fff; }
        .verse-btn.flash { background: #4a3a7a; border-color: #b4a8ff; color: #fff; }
        .on-screen-box {
          background: #1a1a2e;
          border: 1px solid #7c6af7;
          border-radius: 6px;
          padding: 9px 11px;
        }
        .on-screen-ref {
          font-size: 13px;
          font-weight: 700;
          color: #b4a8ff;
          margin-bottom: 4px;
        }
        .on-screen-text {
          color: #a6adc8;
          font-size: 11px;
          line-height: 1.5;
          max-height: 60px;
          overflow-y: auto;
        }
        .on-screen-empty {
          color: #444460;
          font-size: 12px;
          text-align: center;
          padding: 12px 0;
          border: 1px dashed #2d2d45;
          border-radius: 6px;
        }
        .error-msg {
          color: #f38ba8;
          font-size: 11px;
          padding: 4px 0;
        }
        .divider {
          height: 1px;
          background: #252535;
        }
        .spinner {
          display: inline-block;
          width: 12px;
          height: 12px;
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
        {/* Current on-screen passage */}
        <div>
          <div className="section-label">On Screen</div>
          {onScreen ? (
            <div className="on-screen-box">
              <div className="on-screen-ref">{onScreen.reference}</div>
              <div className="on-screen-text">{onScreen.text}</div>
            </div>
          ) : (
            <div className="on-screen-empty">Nothing on screen</div>
          )}
        </div>

        <div className="divider" />

        {/* Reference input */}
        <div>
          <div className="section-label">Send Reference</div>
          <form onSubmit={handleSubmit} className="input-row">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='e.g. John 3:16'
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
        </div>

        {/* Translation */}
        <div>
          <div className="section-label">Translation</div>
          <select value={translation} onChange={(e) => setTranslation(e.target.value as TranslationId)}>
            {TRANSLATIONS.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

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

        {/* Verse navigation — shown when a multi-verse passage is loaded */}
        {onScreen?.verses && onScreen.verses.length > 1 && (
          <>
            <div className="divider" />
            <div>
              <div className="section-label">Verses — click to advance</div>
              <div className="verse-grid">
                {onScreen.verses.map((v) => (
                  <button
                    key={v.verse}
                    className={`verse-btn${onScreen.verseNumber === v.verse ? " active" : ""}${flashRef === String(v.verse) ? " flash" : ""}`}
                    onClick={() => sendVerse(v)}
                    disabled={isLoading}
                  >
                    {v.verse}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Clear */}
        {onScreen && (
          <>
            <div className="divider" />
            <button className="btn-clear" onClick={clearScreen}>
              Clear Screen
            </button>
          </>
        )}
      </div>
    </>
  )
}
