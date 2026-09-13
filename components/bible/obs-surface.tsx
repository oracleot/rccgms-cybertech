"use client"

/**
 * The OBS Bible display — /bible/obs.
 *
 * Behaves like a native OBS text source: transparent, fills whatever size the
 * Browser Source is set to, and finds the largest type that fits by measuring
 * the rendered passage against the source area. Whatever does not fit at the
 * minimum size is paginated, never clipped or shrunk past readability.
 *
 * ?preview=1 shows a sample passage without connecting — for positioning the
 * source in OBS before anyone sends anything.
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { normalizeReference, rangeReference, verseId } from "@/lib/bible/format"
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
  focusId?: string
  verses?: Verse[]
}

/** What the display is currently showing — reported to the dock after every layout. from/to are verse ids. */
export interface DisplayState {
  from: string
  to: string
  page: number
  pages: number
  mode: "single" | "multi"
}

interface Pager {
  key: string
  mode: "single" | "multi"
  pages: Verse[][]
  /** One size for every page of a passage, so type doesn't jump as the operator pages through. */
  commonFont: number | null
}

interface Layout {
  html: string
  font: number
  page: number
  pages: Verse[][]
  mode: "single" | "multi"
}

const PREVIEW_PASSAGE: PassagePayload = {
  reference: "Psalms 23:1-3",
  text: "",
  translation: "kjv",
  translationName: "King James Version",
  verses: [
    { book: "Psalms", chapter: 23, verse: 1, text: "The LORD is my shepherd; I shall not want." },
    { book: "Psalms", chapter: 23, verse: 2, text: "He maketh me to lie down in green pastures: he leadeth me beside the still waters." },
    { book: "Psalms", chapter: 23, verse: 3, text: "He restoreth my soul: he leadeth me in the paths of righteousness for his name's sake." },
  ],
}

const isPreview = () => new URLSearchParams(window.location.search).get("preview") === "1"

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)

function versesOf(p: PassagePayload): Verse[] {
  return p.verses?.length ? p.verses : [{ verse: p.verseNumber ?? 1, text: p.text }]
}

/** The verse a payload asks us to show — by id, else by number for older senders, else the first. */
function focusOf(p: PassagePayload): string {
  const vs = versesOf(p)
  if (p.focusId && vs.some((v) => verseId(v) === p.focusId)) return p.focusId
  if (p.verseNumber != null) {
    const v = vs.find((x) => x.verse === p.verseNumber)
    if (v) return verseId(v)
  }
  return verseId(vs[0])
}

/**
 * One page of the passage as markup. The same string feeds both the hidden
 * measurer and the visible layer, so what is measured is exactly what shows.
 */
function pageHtml(
  passage: PassagePayload,
  verses: Verse[],
  isWhole: boolean,
  s: SceneSettings,
  numbers: boolean
): string {
  const ref = (isWhole ? null : rangeReference(verses)) ?? normalizeReference(passage.reference)
  const refHtml =
    s.refPos === "hide"
      ? ""
      : `<div class="reference" style="color:${s.accent}">${esc(ref)}${
          s.showTranslation ? `<span class="translation"> (${esc(passage.translation.toUpperCase())})</span>` : ""
        }</div>`
  const body = verses
    .map((v) => {
      const num = numbers ? `<sup class="inline-num" style="color:${s.accent}">${v.verse}</sup>` : ""
      return `<span class="v">${num}${esc(v.text)}</span>`
    })
    .join(" ")
  const text = s.style === "card" ? `“${body}”` : body
  return `${s.refPos === "top" ? refHtml : ""}<div class="verse-text" style="color:${s.color}">${text}</div>${
    s.refPos === "bottom" ? refHtml : ""
  }`
}

function contentClass(s: SceneSettings): string {
  return ["content", s.style === "card" ? "card" : "", s.refPos === "top" ? "ref-top" : s.refPos === "bottom" ? "ref-bottom" : ""]
    .filter(Boolean)
    .join(" ")
}

/** Split verses into K runs of roughly equal text, so pages of one passage read alike. */
function balancedSplit(all: Verse[], K: number): Verse[][] {
  const weight = (v: Verse) => v.text.length + 8
  const total = all.reduce((a, v) => a + weight(v), 0)
  const groups: Verse[][] = []
  let cur: Verse[] = []
  let acc = 0
  for (const v of all) {
    if (cur.length && groups.length < K - 1 && acc + weight(v) > (total * (groups.length + 1)) / K) {
      groups.push(cur)
      cur = []
    }
    cur.push(v)
    acc += weight(v)
  }
  groups.push(cur)
  return groups
}

function computeLayout(
  passage: PassagePayload,
  focus: string | null,
  s: SceneSettings,
  surface: HTMLDivElement,
  measurer: HTMLDivElement,
  cache: { current: Pager | null }
): Layout {
  const cs = getComputedStyle(surface)
  const W = surface.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
  const H = surface.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
  const base = Math.min(W, H)
  // Text Size scales both bounds: the largest a short verse may go, and the smallest a long
  // passage will go before it splits into pages. So 150% means "bigger type, more pages".
  const MIN = Math.max(11, base * 0.03 * s.scale)
  const MAX = Math.max(MIN, Math.max(16, base * 0.18) * s.scale)
  // Auto pages at a comfortable size rather than the floor: fewer verses per page,
  // larger type. Multi-verse packs down to MIN before it adds a page.
  const COMFORT = Math.min(MAX, Math.max(MIN, base * 0.055 * s.scale))
  const PACK_AT = s.mode === "auto" ? COMFORT : MIN

  measurer.className = `${contentClass(s)} measure`
  measurer.style.width = `${W}px`
  let lastHtml = ""
  const fits = (html: string, font: number): boolean => {
    if (html !== lastHtml) {
      measurer.innerHTML = html
      lastHtml = html
    }
    measurer.style.setProperty("--fs", `${font}px`)
    return measurer.scrollHeight <= H + 0.5 && measurer.scrollWidth <= W + 0.5
  }
  const maxFont = (html: string): number => {
    if (!fits(html, MIN)) return MIN
    let lo = MIN
    let hi = MAX
    for (let k = 0; k < 8; k++) {
      const mid = (lo + hi) / 2
      if (fits(html, mid)) lo = mid
      else hi = mid
    }
    return lo
  }

  const all = versesOf(passage)
  const n = all.length
  const htmlFor = (vs: Verse[], numbers: boolean) => pageHtml(passage, vs, vs.length === n, s, numbers)

  // Pagination and the common size depend on the passage, look and source size — not on
  // which page is showing — so stepping through pages doesn't re-measure the whole passage.
  const key = [passage.reference, passage.translation, n, JSON.stringify(s), Math.round(W), Math.round(H)].join("|")
  let pager = cache.current
  if (!pager || pager.key !== key) {
    let mode: "single" | "multi"
    let pages: Verse[][]
    const singlePages = () => all.map((v) => [v])

    if (s.mode === "single" || n === 1) {
      mode = "single"
      pages = singlePages()
    } else {
      // Auto and Multi-verse both show the whole passage, paged only when it can't fit;
      // they differ in the size they page at (PACK_AT). Single is the one mode that
      // deliberately puts one verse per page.
      mode = "multi"
      // Greedy first: how many pages are needed when each holds as much as fits at PACK_AT.
      const greedy: Verse[][] = []
      let i = 0
      while (i < n) {
        let lo = 1
        let hi = n - i
        if (fits(htmlFor(all.slice(i, i + hi), true), PACK_AT)) {
          greedy.push(all.slice(i))
          break
        }
        while (lo < hi) {
          const mid = Math.ceil((lo + hi) / 2)
          if (fits(htmlFor(all.slice(i, i + mid), true), PACK_AT)) lo = mid
          else hi = mid - 1
        }
        greedy.push(all.slice(i, i + lo))
        i += lo
      }
      // Then even the pages out, as long as every balanced page still fits.
      pages = greedy
      if (greedy.length > 1) {
        const balanced = balancedSplit(all, greedy.length)
        if (balanced.every((p) => fits(htmlFor(p, true), PACK_AT))) pages = balanced
      }
    }

    const commonFont =
      mode === "multi" && pages.length > 1 ? Math.min(...pages.map((p) => maxFont(htmlFor(p, true)))) : null
    pager = { key, mode, pages, commonFont }
    cache.current = pager
  }

  const { mode, pages, commonFont } = pager
  let page = focus == null ? 0 : pages.findIndex((p) => p.some((v) => verseId(v) === focus))
  if (page < 0) page = 0

  const numbers = mode === "multi" || s.inlineNumber
  const html = htmlFor(pages[page], numbers)
  const font = commonFont ?? maxFont(html)

  return { html, font, page, pages, mode }
}

export function BibleObsSurface() {
  const [passage, setPassage] = useState<PassagePayload | null>(null)
  const [focus, setFocus] = useState<string | null>(null)
  const [visible, setVisible] = useState(false)
  const [settings, setSettings] = useState<SceneSettings>(SCENE_DEFAULTS)
  const [layout, setLayout] = useState<Layout | null>(null)
  const [resizeTick, setResizeTick] = useState(0)

  const surfaceRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null)
  const layoutRef = useRef<Layout | null>(null)
  const pagerRef = useRef<Pager | null>(null)
  const lastReportRef = useRef("")

  useEffect(() => {
    setSettings(normalize({ ...loadSettings(), ...settingsFromQuery(window.location.search) }))
    if (isPreview()) {
      setPassage(PREVIEW_PASSAGE)
      setFocus(focusOf(PREVIEW_PASSAGE))
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
        // A new passage always gets reported, even if it lands on the same verse numbers.
        lastReportRef.current = ""
        setPassage(payload)
        setFocus(focusOf(payload))
        setVisible(true)
      })
      .on("broadcast", { event: "clear" }, () => {
        setVisible(false)
      })
      .on("broadcast", { event: "nav" }, ({ payload }: { payload: { delta?: number; page?: number } }) => {
        const L = layoutRef.current
        if (!L) return
        const target = payload.page ?? L.page + (payload.delta ?? 0)
        const clamped = Math.min(Math.max(target, 0), L.pages.length - 1)
        if (clamped !== L.page) setFocus(verseId(L.pages[clamped][0]))
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
    channelRef.current = channel
    return () => {
      channel.unsubscribe()
    }
  }, [])

  // Any change to the source size in OBS re-fits the passage.
  useEffect(() => {
    const el = surfaceRef.current
    if (!el || typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(() => setResizeTick((t) => t + 1))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useLayoutEffect(() => {
    if (!passage || !surfaceRef.current || !measureRef.current) {
      layoutRef.current = null
      setLayout(null)
      return
    }
    const next = computeLayout(passage, focus, settings, surfaceRef.current, measureRef.current, pagerRef)
    layoutRef.current = next
    setLayout(next)
  }, [passage, focus, settings, resizeTick])

  // Tell the dock what is on screen so its verse list and page controls match.
  useEffect(() => {
    if (!layout || !channelRef.current) return
    const pg = layout.pages[layout.page]
    const state: DisplayState = {
      from: verseId(pg[0]),
      to: verseId(pg[pg.length - 1]),
      page: layout.page,
      pages: layout.pages.length,
      mode: layout.mode,
    }
    const key = JSON.stringify(state)
    if (key === lastReportRef.current) return
    lastReportRef.current = key
    channelRef.current.send({ type: "broadcast", event: "display-state", payload: state })
  }, [layout])

  const justify =
    settings.pos === "top" ? "flex-start" : settings.pos === "bottom" ? "flex-end" : "center"
  const fontFamily = settings.serif
    ? "'Georgia', 'Times New Roman', serif"
    : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  const textShadow =
    settings.shadow && settings.style === "text"
      ? "0 0.08em 0.35em rgba(0,0,0,0.75), 0 0.02em 0.08em rgba(0,0,0,0.9)"
      : "none"

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
          align-items: center;
          padding: 5vh 4vw;
          overflow: hidden;
        }
        .content {
          --fs: 24px;
          font-size: var(--fs);
          width: 100%;
          text-align: center;
          transition: opacity 0.45s ease, transform 0.45s cubic-bezier(0.22,1,0.36,1);
        }
        .content.hidden { opacity: 0; transform: translateY(0.5em); }
        .measure {
          position: absolute;
          top: 0;
          left: 0;
          visibility: hidden;
          pointer-events: none;
          transition: none !important;
        }
        .reference {
          font-size: 0.72em;
          font-weight: 700;
          letter-spacing: 0.01em;
          line-height: 1.25;
        }
        .content.ref-top .reference { margin-bottom: 0.45em; }
        .content.ref-bottom .reference { margin-top: 0.45em; }
        .translation { font-weight: 400; opacity: 0.75; font-size: 0.68em; }
        .verse-text { font-size: 1em; line-height: 1.38; overflow-wrap: break-word; }
        .inline-num {
          font-size: 0.5em;
          font-weight: 700;
          margin-right: 0.25em;
          vertical-align: super;
          line-height: 0;
        }

        /* Card style — the lower-third band */
        .content.card {
          text-align: left;
          background: linear-gradient(135deg, rgba(15,10,30,0.92) 0%, rgba(30,20,60,0.88) 100%);
          border: 1px solid rgba(180,140,255,0.25);
          border-radius: 0.3em;
          padding: 0.55em 0.85em;
          box-shadow: 0 0.4em 1em rgba(0,0,0,0.5);
        }
        .content.card .reference {
          display: flex;
          align-items: center;
          gap: 0.35em;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .content.card .reference::before {
          content: '';
          flex-shrink: 0;
          width: 0.12em;
          height: 1.3em;
          border-radius: 0.05em;
          background: linear-gradient(180deg, #9f7aea, #6b46c1);
        }
        .content.card .verse-text { font-style: italic; }
      `}</style>

      <div
        ref={surfaceRef}
        className="surface"
        style={{ background: bgToCss(settings), justifyContent: justify, fontFamily }}
      >
        <div ref={measureRef} className="content measure" aria-hidden />
        {layout && (
          <div
            className={`${contentClass(settings)}${visible ? "" : " hidden"}`}
            style={{ ["--fs" as string]: `${layout.font}px`, textShadow }}
            dangerouslySetInnerHTML={{ __html: layout.html }}
          />
        )}
      </div>
    </>
  )
}
