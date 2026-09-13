"use client"

/**
 * OBS Full-Screen Bible Scene — /bible/obs/scene
 *
 * Transparent by default so it composites over whatever background the
 * scene already has (church branding, an open-Bible image, live camera).
 *
 * OBS Setup:
 *   1. Add → Browser Source in your Bible scene
 *   2. URL: https://<your-domain>/bible/obs/scene
 *   3. Width: 1920, Height: 1080 — no Custom CSS needed
 *
 * Appearance is controlled by URL parameters, e.g.
 *   /bible/obs/scene?pos=bottom&size=0.8&bg=000000cc
 * See SETTINGS below for the full list.
 */

import { useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { displayReference } from "@/lib/bible/format"

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

interface SceneSettings {
  bg: string
  pos: "center" | "top" | "bottom"
  scale: number
  refPos: "top" | "bottom" | "hide"
  serif: boolean
  color: string
  accent: string
  shadow: boolean
  showTranslation: boolean
}

const DEFAULTS: SceneSettings = {
  bg: "transparent",
  pos: "center",
  scale: 1,
  refPos: "top",
  serif: true,
  color: "#ffffff",
  accent: "#e8ddff",
  shadow: true,
  showTranslation: true,
}

/** Accepts "transparent", "c4a6ff", "#c4a6ff", "000000cc" or any CSS colour name. */
function parseColor(raw: string | null, fallback: string): string {
  if (!raw) return fallback
  const v = raw.trim()
  if (!v) return fallback
  if (/^[0-9a-f]{3,8}$/i.test(v)) return `#${v}`
  return v
}

function readSettings(search: string): SceneSettings {
  const p = new URLSearchParams(search)
  const pos = p.get("pos")
  const refPos = p.get("ref")
  const size = Number(p.get("size"))
  return {
    bg: parseColor(p.get("bg"), DEFAULTS.bg),
    pos: pos === "top" || pos === "bottom" ? pos : DEFAULTS.pos,
    scale: Number.isFinite(size) && size > 0 ? Math.min(size, 3) : DEFAULTS.scale,
    refPos: refPos === "bottom" || refPos === "hide" ? refPos : DEFAULTS.refPos,
    serif: p.get("font") !== "sans",
    color: parseColor(p.get("color"), DEFAULTS.color),
    accent: parseColor(p.get("accent"), DEFAULTS.accent),
    shadow: p.get("shadow") !== "0",
    showTranslation: p.get("translation") !== "0",
  }
}

export default function BibleObsScenePage() {
  const [passage, setPassage] = useState<PassagePayload | null>(null)
  const [visible, setVisible] = useState(false)
  const [settings, setSettings] = useState<SceneSettings>(DEFAULTS)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null)

  useEffect(() => {
    setSettings(readSettings(window.location.search))
  }, [])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(OBS_CHANNEL, {
      config: { broadcast: { self: false } },
    })
    channel
      .on("broadcast", { event: "passage" }, ({ payload }: { payload: PassagePayload }) => {
        setPassage(payload)
        setVisible(true)
      })
      .on("broadcast", { event: "clear" }, () => {
        setVisible(false)
      })
      .subscribe()
    channelRef.current = channel
    return () => {
      channel.unsubscribe()
    }
  }, [])

  const justify =
    settings.pos === "top" ? "flex-start" : settings.pos === "bottom" ? "flex-end" : "center"
  const fontFamily = settings.serif
    ? "'Georgia', 'Times New Roman', serif"
    : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  const textShadow = settings.shadow ? "0 3px 18px rgba(0,0,0,0.75), 0 1px 3px rgba(0,0,0,0.9)" : "none"

  const reference = passage
    ? displayReference(passage.reference, passage.verseNumber, passage.verses)
    : ""

  const referenceBlock = passage && settings.refPos !== "hide" && (
    <div
      className="reference"
      style={{
        color: settings.accent,
        fontSize: `${44 * settings.scale}px`,
        textShadow,
        marginTop: settings.refPos === "bottom" ? `${40 * settings.scale}px` : 0,
        marginBottom: settings.refPos === "top" ? `${36 * settings.scale}px` : 0,
      }}
    >
      {reference}
      {settings.showTranslation && (
        <span className="translation" style={{ fontSize: `${28 * settings.scale}px` }}>
          {" "}
          ({passage.translation.toUpperCase()})
        </span>
      )}
    </div>
  )

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body {
          width: 1920px;
          height: 1080px;
          overflow: hidden;
          background: transparent;
        }
        .scene {
          width: 1920px;
          height: 1080px;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 100px 140px;
        }
        .content {
          width: 100%;
          text-align: center;
          transition: opacity 0.45s ease, transform 0.45s cubic-bezier(0.22,1,0.36,1);
        }
        .content.hidden {
          opacity: 0;
          transform: translateY(20px);
        }
        .reference { font-weight: 700; letter-spacing: 0.01em; }
        .translation { font-weight: 400; opacity: 0.75; }
        .verse-text { line-height: 1.42; }
      `}</style>

      <div className="scene" style={{ background: settings.bg, justifyContent: justify, fontFamily }}>
        <div className={`content${visible ? "" : " hidden"}`}>
          {passage && (
            <>
              {settings.refPos === "top" && referenceBlock}
              <div
                className="verse-text"
                style={{
                  color: settings.color,
                  fontSize: `${58 * settings.scale}px`,
                  textShadow,
                }}
              >
                {passage.text}
              </div>
              {settings.refPos === "bottom" && referenceBlock}
            </>
          )}
        </div>
      </div>
    </>
  )
}
