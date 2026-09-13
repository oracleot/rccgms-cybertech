"use client"

/**
 * The OBS display surface, shared by /bible/obs and /bible/obs/scene.
 *
 * Works like a native OBS text source: transparent, fills whatever size the
 * Browser Source is set to, and sizes its type relative to that width — so a
 * 400×500 source scaled up in the scene looks the same as a 1920×1080 one.
 * OBS's default Custom CSS already makes <body> transparent; this page never
 * paints over it.
 *
 * Add ?preview=1 to show a sample verse without connecting — handy for
 * positioning and sizing the source in OBS before anyone sends anything.
 */

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { displayReference } from "@/lib/bible/format"
import { obsChannelName } from "@/lib/bible/obs-channel"
import {
  SCENE_DEFAULTS,
  bgToCss,
  loadSettings,
  normalize,
  saveSettings,
  settingsFromQuery,
  type SceneSettings,
} from "@/lib/bible/scene-settings"

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

const PREVIEW_PASSAGE: PassagePayload = {
  reference: "Psalms 23",
  text: "The LORD is my shepherd; I shall not want. He maketh me to lie down in green pastures: he leadeth me beside the still waters.",
  translation: "kjv",
  translationName: "King James Version",
  verseNumber: 1,
  verses: [{ book: "Psalms", chapter: 23, verse: 1, text: "The LORD is my shepherd; I shall not want." }],
}

function isPreview(): boolean {
  return new URLSearchParams(window.location.search).get("preview") === "1"
}

export function BibleObsSurface() {
  const [passage, setPassage] = useState<PassagePayload | null>(null)
  const [visible, setVisible] = useState(false)
  const [settings, setSettings] = useState<SceneSettings>(SCENE_DEFAULTS)

  useEffect(() => {
    setSettings(normalize({ ...loadSettings(), ...settingsFromQuery(window.location.search) }))
    if (isPreview()) {
      setPassage(PREVIEW_PASSAGE)
      setVisible(true)
    }
  }, [])

  useEffect(() => {
    if (isPreview()) return
    const supabase = createClient()
    const channel = supabase.channel(obsChannelName(), {
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
        // OBS shuts this source down whenever its scene isn't visible, so on every
        // switch back we ask the dock for the verse and look that are already live
        // rather than coming back blank mid-reading.
        if (status === "SUBSCRIBED") {
          channel.send({ type: "broadcast", event: "request-state", payload: {} })
        }
      })
    return () => {
      channel.unsubscribe()
    }
  }, [])

  const justify =
    settings.pos === "top" ? "flex-start" : settings.pos === "bottom" ? "flex-end" : "center"
  const fontFamily = settings.serif
    ? "'Georgia', 'Times New Roman', serif"
    : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  const textShadow =
    settings.shadow && settings.style === "text"
      ? "0 0.15em 0.6em rgba(0,0,0,0.75), 0 0.04em 0.12em rgba(0,0,0,0.9)"
      : "none"

  const reference = passage && settings.refPos !== "hide" && (
    <div className="reference" style={{ color: settings.accent, textShadow }}>
      {displayReference(passage.reference, passage.verseNumber, passage.verses)}
      {settings.showTranslation && (
        <span className="translation"> ({passage.translation.toUpperCase()})</span>
      )}
    </div>
  )

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body {
          width: 100%;
          height: 100%;
          overflow: hidden;
          background: transparent !important;
        }
        .surface {
          width: 100vw;
          height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 5vh 4vw;
        }
        .content {
          width: 100%;
          text-align: center;
          transition: opacity 0.45s ease, transform 0.45s cubic-bezier(0.22,1,0.36,1);
        }
        .content.hidden { opacity: 0; transform: translateY(0.8em); }
        .reference {
          font-size: calc(2.6vw * var(--s));
          font-weight: 700;
          letter-spacing: 0.01em;
          line-height: 1.25;
        }
        .content.ref-top .reference { margin-bottom: calc(1.4vw * var(--s)); }
        .content.ref-bottom .reference { margin-top: calc(1.4vw * var(--s)); }
        .translation { font-weight: 400; opacity: 0.75; font-size: 0.68em; }
        .verse-text { font-size: calc(3.6vw * var(--s)); line-height: 1.4; }
        .inline-num {
          font-size: 0.48em;
          font-weight: 700;
          margin-right: 0.3em;
          vertical-align: super;
          line-height: 0;
        }

        /* Card style — the lower-third band */
        .content.card {
          text-align: left;
          background: linear-gradient(135deg, rgba(15,10,30,0.92) 0%, rgba(30,20,60,0.88) 100%);
          border: 1px solid rgba(180,140,255,0.25);
          border-radius: 0.6vw;
          padding: calc(1.6vw * var(--s)) calc(2.4vw * var(--s));
          box-shadow: 0 1.2vw 3vw rgba(0,0,0,0.5);
        }
        .content.card .reference {
          display: flex;
          align-items: center;
          gap: 0.8vw;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .content.card .reference::before {
          content: '';
          flex-shrink: 0;
          width: 0.22vw;
          height: 1.3em;
          border-radius: 0.1vw;
          background: linear-gradient(180deg, #9f7aea, #6b46c1);
        }
        .content.card .verse-text { font-style: italic; }
      `}</style>

      <div
        className="surface"
        style={{
          background: bgToCss(settings),
          justifyContent: justify,
          fontFamily,
          ["--s" as string]: settings.scale,
        }}
      >
        <div
          className={[
            "content",
            visible ? "" : "hidden",
            settings.style === "card" ? "card" : "",
            settings.refPos === "top" ? "ref-top" : settings.refPos === "bottom" ? "ref-bottom" : "",
          ].join(" ")}
        >
          {passage && (
            <>
              {settings.refPos === "top" && reference}
              <div className="verse-text" style={{ color: settings.color, textShadow }}>
                {settings.inlineNumber && passage.verseNumber != null && (
                  <sup className="inline-num" style={{ color: settings.accent }}>
                    {passage.verseNumber}
                  </sup>
                )}
                {settings.style === "card" ? `“${passage.text}”` : passage.text}
              </div>
              {settings.refPos === "bottom" && reference}
            </>
          )}
        </div>
      </div>
    </>
  )
}
