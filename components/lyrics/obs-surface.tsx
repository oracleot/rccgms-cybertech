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
  LYRICS_DEFAULTS,
  loadSettings,
  normalize,
  saveSettings,
  type LyricsSettings,
} from "@/lib/lyrics/settings"
import type { LyricItemPayload } from "@/lib/lyrics/types"

const PREVIEW_ITEM: LyricItemPayload = {
  setId: "preview",
  setTitle: "Preview",
  type: "lyrics",
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

  // Lyrics/prayer overlays are usually wide bands (a lower-third, a full-width
  // caption bar) rather than the squarish boxes a Bible passage fills, so type
  // size scales off the safe area's height, not min(W,H) — a short caption in a
  // 1920x300 bar should still read like a broadcast caption, not shrink to fit
  // an imaginary square. Width is still enforced for real by fits() below.
  const MIN = Math.max(11, safeH * 0.05 * s.scale)
  const MAX = Math.max(MIN, Math.max(18, safeH * 0.6) * s.scale)

  const html = `<div class="primary">${primaryHtml(item.group.primary)}</div>${
    item.group.secondary ? `<div class="secondary">${esc(item.group.secondary)}</div>` : ""
  }`
  measurer.innerHTML = html
  measurer.style.width = `${safeW}px`

  const fits = (font: number): boolean => {
    measurer.style.setProperty("--fs", `${font}px`)
    if (measurer.scrollHeight > safeH + 0.5 || measurer.scrollWidth > safeW + 0.5) return false
    if (s.maxLines > 0) {
      const p = measurer.querySelector<HTMLElement>(".primary")
      if (p) {
        const lineHeightPx = font * 1.3
        const lines = Math.round(p.scrollHeight / lineHeightPx)
        if (lines > s.maxLines) return false
      }
    }
    return true
  }

  let font = MIN
  if (fits(MIN)) {
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

export function LyricsObsSurface() {
  const [item, setItem] = useState<LyricItemPayload | null>(null)
  const [visible, setVisible] = useState(false)
  const [settings, setSettings] = useState<LyricsSettings>(LYRICS_DEFAULTS)
  const [layout, setLayout] = useState<Layout | null>(null)
  const [resizeTick, setResizeTick] = useState(0)

  const surfaceRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase's RealtimeChannel type isn't exported for a ref
  const channelRef = useRef<any>(null)
  const lockedRef = useRef(false)

  useEffect(() => {
    lockedRef.current = loadLock()
    setSettings(loadSettings())
    if (isPreview()) {
      setItem(PREVIEW_ITEM)
      setVisible(true)
    }
  }, [])

  useEffect(() => {
    if (isPreview()) return
    const supabase = createClient()
    const channel = supabase.channel(lyricsChannelName(), {
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
        saveSettings(next)
      })
      .on("broadcast", { event: "lock" }, ({ payload }: { payload: LockPayload }) => {
        const on = !!payload?.locked
        lockedRef.current = on
        saveLock(on)
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
  }, [])

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

  const justify = settings.vAlign === "top" ? "flex-start" : settings.vAlign === "bottom" ? "flex-end" : "center"
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
        .primary { line-height: 1.3; overflow-wrap: break-word; }
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
        <div ref={measureRef} className="content measure" aria-hidden />
        {layout && item && (
          <div
            style={{
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
              dangerouslySetInnerHTML={{
                __html: `<div class="primary">${primaryHtml(item.group.primary)}</div>${
                  item.group.secondary
                    ? `<div class="secondary" style="color:${settings.secondaryColor}">${esc(item.group.secondary)}</div>`
                    : ""
                }`,
              }}
            />
          </div>
        )}
      </div>
    </>
  )
}
