"use client"

/**
 * The OBS Lyrics/Prayer display — /lyrics/obs.
 *
 * A native-feeling OBS text source: transparent, no logo or watermark, fills
 * whatever size the Browser Source is set to, and fits the current group's
 * text to the safe area (the source area minus configurable margins that
 * keep clear of logos/icons OBS is already compositing). Text is measured,
 * not guessed from character count, so "JESUS" can go large and a long
 * prayer point shrinks to fit — never clipped.
 *
 * ?preview=1 shows a sample group without connecting — for positioning the
 * source in OBS before anyone sends anything.
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { lyricsChannelName } from "@/lib/lyrics/channel"
import { loadLock, saveLock, type LockPayload } from "@/lib/lyrics/lock"
import {
  backgroundCss,
  LYRICS_DEFAULTS,
  loadSettings,
  normalize,
  saveSettings,
  type LyricsSettings,
} from "@/lib/lyrics/settings"
import { defaultPresentation, type LyricItemPayload } from "@/lib/lyrics/types"
import { useRoomSelection } from "./use-room-selection"
import { JoinScreen } from "./join-screen"
import { PresenceBeacon } from "./presence-beacon"

const PREVIEW_ITEM: LyricItemPayload = {
  setId: "preview",
  setTitle: "Preview",
  type: "song",
  group: { id: "p1", primary: "SO GI BU ONYE INYE AKA M", secondary: "YOU ALONE ARE MY HELPER" },
  index: 0,
  total: 1,
}

const isPreview = () => new URLSearchParams(window.location.search).get("preview") === "1"

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)

function primaryHtml(primary: string): string {
  return primary.split("\n").map(esc).join("<br/>")
}

/**
 * The verse marker for a hymn cue, per the set's chosen style. The number is
 * structural (group.section.number), never part of the lyric text, so the
 * same content can present as a heading, a side number, a superscript, or
 * nothing at all without the words changing.
 *
 * Songs get nothing here: "Verse 1" / "Chorus" are operator metadata and must
 * never reach the congregation's screen.
 */
function verseMarkerHtml(item: LyricItemPayload): { lead: string; heading: string } {
  const none = { lead: "", heading: "" }
  if (item.type !== "hymn") return none
  const presentation = item.presentation ?? defaultPresentation(item.type)
  if (presentation.verseNumberStyle === "none" || presentation.sectionLabels === "off") return none

  const section = item.group.section
  // Only numbered sections carry a marker — a chorus has no verse number, and
  // inventing one would mislabel it.
  if (!section || section.number === undefined) return none
  const n = esc(String(section.number))

  switch (presentation.verseNumberStyle) {
    case "heading":
      return { lead: "", heading: `<div class="verse-heading">${n}</div>` }
    case "inline":
      return { lead: `<span class="verse-inline">${n}</span>`, heading: "" }
    case "superscript":
      return { lead: `<span class="verse-sup">${n}</span>`, heading: "" }
    default:
      return none
  }
}

/** One HTML builder shared by the hidden measurer and the visible layer, so what is measured is exactly what shows. */
function itemHtml(item: LyricItemPayload, s: LyricsSettings): string {
  const repeatBadge = item.group.repeat && item.group.repeat > 1 ? `<span class="repeat">×${item.group.repeat}</span>` : ""
  const secondary = item.group.secondary
    ? `<div class="secondary" style="color:${s.secondaryColor}">${esc(item.group.secondary)}</div>`
    : ""
  const { lead, heading } = verseMarkerHtml(item)
  const hymnClass = item.type === "hymn" ? " is-hymn" : ""
  return `${heading}<div class="primary${hymnClass}">${lead}${primaryHtml(item.group.primary)}${repeatBadge}</div>${secondary}`
}

/**
 * The size a cue is shown at when it fits — a broadcast caption's normal
 * weight on screen, as a fraction of the safe area's height, at 100% text
 * size. Lowered from 0.17 after real production use: 0.17 made even a short
 * single line fill far too much of the frame (its 100% default was ~150px on
 * 1080). This is the baseline; the operator scales around it with the Text
 * size control (1%–150%).
 */
const PREFERRED_HEIGHT_RATIO = 0.09
/** Hard ceiling for short/thin sources, so the preferred size can't overflow a caption bar. */
const MAX_HEIGHT_RATIO = 0.42

/**
 * Hymns show a complete verse as one cue (3–5 lines). At the song baseline
 * (~50% slider) the text is tiny because the MAX is capped at PREFERRED.
 * Hymns get their own sizing: the slider still influences the result, but the
 * algorithm fills available space rather than capping at a subtitle size.
 */
const HYMN_MAX_HEIGHT_RATIO = 0.82
const HYMN_UPPER_BOUND_PX = 140

interface Layout {
  font: number
  html: string
  padTop: number
  padBottom: number
  padLeft: number
  padRight: number
}

function computeLayout(
  item: LyricItemPayload,
  s: LyricsSettings,
  surface: HTMLDivElement,
  measurer: HTMLDivElement
): Layout {
  const totalW = surface.clientWidth
  const totalH = surface.clientHeight
  const padTop = (totalH * s.safeTop) / 100
  const padBottom = (totalH * s.safeBottom) / 100
  const padLeft = (totalW * s.safeLeft) / 100
  const padRight = (totalW * s.safeRight) / 100
  const safeW = Math.max(10, totalW - padLeft - padRight)
  const safeH = Math.max(10, totalH - padTop - padBottom)

  const isHymn = item.type === "hymn"

  // Songs: auto-fit prevents overflow but does not fill the safe area. Every
  // cue starts at the same preferred size and only shrinks.
  // Hymns: fill available space — a complete verse should be large and centred,
  // not tiny subtitle text at the bottom.
  const MIN = Math.max(11, safeH * 0.05 * (isHymn ? Math.max(s.scale, 0.5) : s.scale))
  const PREFERRED = Math.max(MIN, safeH * PREFERRED_HEIGHT_RATIO * s.scale)
  let MAX: number
  if (isHymn) {
    const hymnScale = Math.max(s.scale, 0.5)
    MAX = Math.max(MIN, Math.min(HYMN_UPPER_BOUND_PX, safeH * HYMN_MAX_HEIGHT_RATIO * hymnScale))
  } else {
    MAX = Math.max(MIN, Math.min(PREFERRED, Math.max(18, safeH * MAX_HEIGHT_RATIO) * s.scale))
  }

  const html = itemHtml(item, s)
  measurer.innerHTML = html
  measurer.style.width = `${safeW}px`

  const fits = (font: number): boolean => {
    measurer.style.setProperty("--fs", `${font}px`)
    if (measurer.scrollHeight > safeH + 0.5 || measurer.scrollWidth > safeW + 0.5) return false
    // maxLines limits song cues (subtitle-style); hymn verses show all lines.
    if (s.maxLines > 0 && !isHymn) {
      const p = measurer.querySelector<HTMLElement>(".primary")
      if (p) {
        const lineHeightPx = font * (isHymn ? 1.42 : 1.3)
        const lines = Math.round(p.scrollHeight / lineHeightPx)
        if (lines > s.maxLines) return false
      }
    }
    return true
  }

  // Take the preferred size whenever it fits — no growing past it just
  // because there is room. Only when it overflows do we search downward for
  // the largest size that does fit, floored at MIN (clipping is never the
  // answer; slightly small text is).
  let font = MAX
  if (!fits(MAX)) {
    let lo = MIN
    let hi = MAX
    for (let k = 0; k < 8; k++) {
      const mid = (lo + hi) / 2
      if (fits(mid)) lo = mid
      else hi = mid
    }
    font = lo
  }

  return { font, html, padTop, padBottom, padLeft, padRight }
}

/**
 * Resolves the room and shows the join screen, then mounts the display bound to
 * that room. key={room} remounts the display on a switch, so no cue, lock or
 * setting from the previous room can linger.
 */
export function LyricsObsSurface() {
  const preview = typeof window !== "undefined" && isPreview()
  const { room, ready, join, leave } = useRoomSelection()

  if (preview) return <ObsDisplay room={null} preview onLeave={leave} />
  if (!ready) return null
  if (!room) return <JoinScreen title="Lyrics display" onJoin={join} />
  return <ObsDisplay key={room} room={room} preview={false} onLeave={leave} />
}

function ObsDisplay({ room, preview, onLeave }: { room: string | null; preview: boolean; onLeave: () => void }) {
  const [item, setItem] = useState<LyricItemPayload | null>(null)
  const [visible, setVisible] = useState(false)
  const [settings, setSettings] = useState<LyricsSettings>(LYRICS_DEFAULTS)
  const [layout, setLayout] = useState<Layout | null>(null)
  const [resizeTick, setResizeTick] = useState(0)
  const [switching, setSwitching] = useState(false)

  const surfaceRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase's RealtimeChannel type isn't exported for a ref
  const channelRef = useRef<any>(null)
  const lockedRef = useRef(false)

  useEffect(() => {
    if (preview) {
      setItem(PREVIEW_ITEM)
      setVisible(true)
      return
    }
    if (!room) return
    lockedRef.current = loadLock(room)
    setSettings(loadSettings(room))
  }, [room, preview])

  useEffect(() => {
    if (preview || !room) return
    const supabase = createClient()
    const channel = supabase.channel(lyricsChannelName(room), {
      config: { broadcast: { self: false } },
    })
    const announceLock = () =>
      channel.send({ type: "broadcast", event: "lock-state", payload: { locked: lockedRef.current } })

    channel
      .on("broadcast", { event: "item" }, ({ payload }: { payload: LyricItemPayload }) => {
        if (lockedRef.current && !payload.restore) return
        setItem(payload)
        setVisible(true)
      })
      .on("broadcast", { event: "clear" }, () => {
        if (lockedRef.current) return
        setVisible(false)
      })
      .on("broadcast", { event: "settings" }, ({ payload }: { payload: unknown }) => {
        const next = normalize(payload)
        setSettings(next)
        saveSettings(room, next)
      })
      .on("broadcast", { event: "lock" }, ({ payload }: { payload: LockPayload }) => {
        const on = !!payload?.locked
        lockedRef.current = on
        saveLock(room, on)
        void announceLock()
      })
      .on("broadcast", { event: "request-lock" }, () => {
        void announceLock()
      })
      .subscribe((status: string) => {
        // OBS shuts this source down whenever its scene isn't visible, so on every
        // switch back we ask the dock for what is already live rather than coming
        // back blank mid-song.
        if (status === "SUBSCRIBED") {
          channel.send({ type: "broadcast", event: "request-state", payload: {} })
          void announceLock()
        }
      })
    channelRef.current = channel
    return () => {
      channel.unsubscribe()
    }
  }, [room, preview])

  useEffect(() => {
    const el = surfaceRef.current
    if (!el || typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(() => setResizeTick((t) => t + 1))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useLayoutEffect(() => {
    if (!item || !surfaceRef.current || !measureRef.current) {
      setLayout(null)
      return
    }
    setLayout(computeLayout(item, settings, surfaceRef.current, measureRef.current))
  }, [item, settings, resizeTick])

  const isHymnItem = item?.type === "hymn"
  const vAlign = isHymnItem ? "center" : settings.vAlign
  const justify = vAlign === "top" ? "flex-start" : vAlign === "bottom" ? "flex-end" : "center"
  const alignItems = settings.align === "left" ? "flex-start" : settings.align === "right" ? "flex-end" : "center"
  const textAlign = settings.align
  const fontFamily = settings.font === "serif"
    ? "'Georgia', 'Times New Roman', serif"
    : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  const shadowOpacity = 0.35 + (settings.shadowStrength / 100) * 0.55
  const shadowBlur = 0.15 + (settings.shadowStrength / 100) * 0.35
  const textShadow =
    settings.shadowStrength > 0
      ? `0 0.06em ${shadowBlur}em rgba(0,0,0,${shadowOpacity}), 0 0.02em 0.06em rgba(0,0,0,${Math.min(shadowOpacity + 0.15, 0.95)})`
      : "none"
  const transitionCss =
    settings.transition === "fade" ? "opacity 220ms ease, transform 220ms cubic-bezier(0.22,1,0.36,1)" : "none"

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
          position: relative;
          width: 100vw;
          height: 100vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .content {
          --fs: 28px;
          font-size: var(--fs);
          font-weight: 800;
          max-width: 100%;
        }
        .measure {
          position: absolute;
          top: 0;
          left: 0;
          visibility: hidden;
          pointer-events: none;
          transition: none !important;
        }
        .bg-layer {
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
        }
        /* Switch-room chip. Fully invisible until the corner is hovered, so it
           never shows on the OBS stream (which has no pointer) — it's reachable
           only through OBS's Interact window or a browser, to change rooms
           without touching the permanent URL. */
        .switch-chip {
          position: absolute; top: 6px; right: 6px; z-index: 3;
          opacity: 0; transition: opacity 120ms ease;
          background: rgba(12,12,18,0.85); border: 1px solid #313244; border-radius: 6px;
          color: #cdd6f4; cursor: pointer; font-size: 10px; padding: 4px 8px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .switch-chip:hover, .switch-corner:hover .switch-chip { opacity: 1; }
        .switch-corner {
          position: absolute; top: 0; right: 0; width: 130px; height: 44px; z-index: 3;
        }
        .switch-confirm { display: flex; gap: 5px; align-items: center; opacity: 1; }
        .switch-confirm button {
          background: #2a2040; border: 1px solid #45455e; border-radius: 4px; color: #cdd6f4;
          cursor: pointer; font-size: 10px; padding: 2px 6px;
        }
        .primary { line-height: 1.3; overflow-wrap: break-word; }
        /* Hymn verses are read together by a congregation rather than
           advanced phrase by phrase, so the lines sit a little more open. */
        .primary.is-hymn { line-height: 1.42; }
        .verse-heading {
          font-size: 0.62em;
          font-weight: 800;
          line-height: 1.1;
          margin-bottom: 0.22em;
          opacity: 0.75;
        }
        .verse-inline {
          display: inline-block;
          font-weight: 800;
          margin-right: 0.45em;
          opacity: 0.75;
        }
        .verse-sup {
          font-size: 0.5em;
          font-weight: 800;
          margin-right: 0.25em;
          opacity: 0.75;
          vertical-align: super;
        }
        .repeat {
          display: inline-block;
          margin-left: 0.3em;
          font-size: 0.4em;
          font-weight: 700;
          opacity: 0.6;
          vertical-align: middle;
        }
        .secondary {
          font-weight: 600;
          font-size: 0.56em;
          line-height: 1.3;
          margin-top: 0.35em;
          opacity: 0.92;
          overflow-wrap: break-word;
        }
      `}</style>

      <div ref={surfaceRef} className="surface">
        {/* Announce this display in the room's presence (renders nothing). */}
        {!preview && room && <PresenceBeacon roomId={room} role="display" />}
        {/* Hover-only room switch — never visible on the OBS stream (no
            pointer there), reachable through OBS Interact or a browser. Two
            steps so a stray click can't drop the display mid-service. Not
            shown in preview. */}
        {!preview && room && (
          <div className="switch-corner">
            {switching ? (
              <div className="switch-chip switch-confirm">
                <span>Leave {room}?</span>
                <button onClick={onLeave}>Yes</button>
                <button onClick={() => setSwitching(false)}>No</button>
              </div>
            ) : (
              <button className="switch-chip" onClick={() => setSwitching(true)}>
                Room {room} · Switch
              </button>
            )}
          </div>
        )}
        {/* Optional background, behind the text and filling whatever size the
            Browser Source is. Absolutely positioned so it never affects the
            measured text layout or the safe margins. Only shown while
            something is live, so Clear always returns the source to fully
            transparent regardless of the chosen background. Transparent mode
            renders nothing. */}
        {settings.backgroundMode !== "transparent" && (
          <div
            className="bg-layer"
            style={{
              background: backgroundCss(settings),
              opacity: visible ? settings.backgroundOpacity / 100 : 0,
              transition: transitionCss,
            }}
          />
        )}
        <div ref={measureRef} className="content measure" aria-hidden />
        {layout && item && (
          <div
            style={{
              position: "relative",
              zIndex: 1,
              display: "flex",
              flexDirection: "column",
              flex: 1,
              justifyContent: justify,
              alignItems,
              paddingTop: layout.padTop,
              paddingBottom: layout.padBottom,
              paddingLeft: layout.padLeft,
              paddingRight: layout.padRight,
            }}
          >
            <div
              className="content"
              style={{
                ["--fs" as string]: `${layout.font}px`,
                textAlign,
                color: settings.color,
                textShadow,
                fontFamily,
                transition: transitionCss,
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(0.4em)",
              }}
              dangerouslySetInnerHTML={{ __html: itemHtml(item, settings) }}
            />
          </div>
        )}
      </div>
    </>
  )
}
