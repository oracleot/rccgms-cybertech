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
 * Appearance is set from the OBS dock's settings panel. URL parameters
 * (see settingsFromQuery) still work and win on first load.
 */

import { useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { displayReference } from "@/lib/bible/format"
import {
  SCENE_DEFAULTS,
  bgToCss,
  loadSettings,
  normalize,
  saveSettings,
  settingsFromQuery,
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

export default function BibleObsScenePage() {
  const [passage, setPassage] = useState<PassagePayload | null>(null)
  const [visible, setVisible] = useState(false)
  const [settings, setSettings] = useState<SceneSettings>(SCENE_DEFAULTS)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null)

  useEffect(() => {
    setSettings(normalize({ ...loadSettings(), ...settingsFromQuery(window.location.search) }))
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
      .on("broadcast", { event: "settings" }, ({ payload }: { payload: unknown }) => {
        const next = normalize(payload)
        setSettings(next)
        saveSettings(next)
      })
      .subscribe((status: string) => {
        // OBS shuts this source down whenever the scene isn't visible, so on every
        // switch back we ask the dock for the verse and look that are already live
        // rather than coming back blank mid-reading.
        if (status === "SUBSCRIBED") {
          channel.send({ type: "broadcast", event: "request-state", payload: {} })
        }
      })
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
  const textShadow = settings.shadow
    ? "0 3px 18px rgba(0,0,0,0.75), 0 1px 3px rgba(0,0,0,0.9)"
    : "none"

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
      {displayReference(passage.reference, passage.verseNumber, passage.verses)}
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
        .content.hidden { opacity: 0; transform: translateY(20px); }
        .reference { font-weight: 700; letter-spacing: 0.01em; }
        .translation { font-weight: 400; opacity: 0.75; }
        .verse-text { line-height: 1.42; }
      `}</style>

      <div
        className="scene"
        style={{ background: bgToCss(settings), justifyContent: justify, fontFamily }}
      >
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
