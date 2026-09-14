/**
 * Turns a Word document (already converted to HTML by mammoth) into draft
 * songs for review before anything is saved. Pure string/regex processing —
 * no DOM APIs — so this runs identically in the browser and in a plain Node
 * script, and can be exercised by scripts/check-docx-import.ts without a
 * browser at all.
 *
 * The three real church documents are expected to differ in formatting, so
 * this reads multiple signals (headings, "Song N", a short bold paragraph,
 * blank sections, table rows) rather than assuming one fixed layout, and
 * never invents a title with confidence it doesn't have — an uncertain
 * title falls back to "Song N" and is flagged for the operator to fix in
 * the review screen, rather than guessed from the lyrics themselves.
 */

import { splitLyrics } from "./parse"
import type { LyricGroup } from "./types"

export interface ImportedSong {
  title: string
  titleConfidence: "high" | "low"
  scriptureReference?: string
  groups: LyricGroup[]
  /** Raw lines that became lyrics — kept for the review screen, not saved. */
  sourceLines: string[]
}

interface HtmlBlock {
  type: "heading" | "paragraph" | "table"
  level?: number
  text: string
  bold?: boolean
  rows?: string[][]
}

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;|&lt;|&gt;|&quot;|&#39;|&apos;|&nbsp;/g, (e) => ENTITIES[e] ?? e)
    .replace(/\s+/g, " ")
    .trim()
}

const BLOCK_RE = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>|<p[^>]*>([\s\S]*?)<\/p>|<table[^>]*>([\s\S]*?)<\/table>/gi
const ROW_RE = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
const CELL_RE = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi

/** Walks mammoth's HTML output top to bottom, in document order — order matters (a scripture line belongs to the song after it). */
function parseBlocks(html: string): HtmlBlock[] {
  const blocks: HtmlBlock[] = []
  BLOCK_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = BLOCK_RE.exec(html))) {
    if (m[1] !== undefined) {
      const text = stripTags(m[2])
      if (text) blocks.push({ type: "heading", level: Number(m[1]), text })
    } else if (m[3] !== undefined) {
      const raw = m[3].trim()
      const text = stripTags(raw)
      if (text) {
        const strong = raw.match(/^<strong>([\s\S]*)<\/strong>$/i)
        const bold = !!strong && stripTags(strong[1]) === text
        blocks.push({ type: "paragraph", text, bold })
      }
    } else if (m[4] !== undefined) {
      const rows: string[][] = []
      ROW_RE.lastIndex = 0
      let rm: RegExpExecArray | null
      while ((rm = ROW_RE.exec(m[4]))) {
        const cells: string[] = []
        CELL_RE.lastIndex = 0
        let cm: RegExpExecArray | null
        while ((cm = CELL_RE.exec(rm[1]))) cells.push(stripTags(cm[1]))
        if (cells.some(Boolean)) rows.push(cells)
      }
      if (rows.length) blocks.push({ type: "table", text: "", rows })
    }
  }
  return blocks
}

const SONG_N_RE = /^song\s*#?\s*\d+\b/i
const LEADING_NUMBER_RE = /^\d+[.)]\s*/

// A permissive "looks like a scripture reference" gate — deliberately its own
// standalone regex, not a reuse of lib/bible's parser, so Lyrics stays
// uncoupled from the Bible module. False positives/negatives just mean the
// operator corrects it in review; nothing downstream trusts this blindly.
const SCRIPTURE_RE = /^(?:[1-3]\s?)?[A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?\s+\d{1,3}(?::\d{1,3}(?:-\d{1,3})?)?\.?$/
// Words that fit the same shape ("Capitalised word" + number) but obviously
// aren't a Bible book, so a stray "Song 1" or "Verse 3" line isn't mistaken
// for a reading.
const NOT_A_BOOK_NAME = /^(Song|Verse|Chapter|Page|Number|No|Slide|Track|Item)$/i

interface Boundary {
  title: string
  confidence: "high" | "low"
}

function looksLikeSongBoundary(block: HtmlBlock): Boundary | null {
  const t = block.text.trim()
  if (!t) return null
  if (block.type === "heading") {
    const cleaned = t.replace(LEADING_NUMBER_RE, "").trim() || t
    return { title: cleaned, confidence: SONG_N_RE.test(t) ? "low" : "high" }
  }
  if (block.type === "paragraph") {
    if (SONG_N_RE.test(t)) return { title: t, confidence: "low" }
    // A short bold paragraph on its own line reads as a title in most church
    // song sheets, even without a real Word heading style applied.
    if (block.bold && t.length <= 60 && t.split(/\s+/).length <= 8) {
      return { title: t, confidence: "high" }
    }
  }
  return null
}

export function isScriptureLike(text: string): boolean {
  const t = text.trim()
  if (!SCRIPTURE_RE.test(t)) return false
  const firstWord = t.replace(/^[1-3]\s?/, "").split(/\s+/)[0]
  return !NOT_A_BOOK_NAME.test(firstWord)
}

interface Draft {
  title: string
  confidence: "high" | "low"
  scripture?: string
  lines: string[]
}

function finish(d: Draft): ImportedSong {
  const raw = d.lines.join("\n")
  return {
    title: d.title,
    titleConfidence: d.confidence,
    scriptureReference: d.scripture,
    groups: raw.trim() ? splitLyrics(raw) : [],
    sourceLines: d.lines,
  }
}

/**
 * Detects song boundaries from headings, "Song N" markers, numbered
 * headings and short bold title-like paragraphs; routes anything that looks
 * like a scripture reference to metadata instead of the lyric text; and
 * splits each song's remaining lines into broadcast-sized cues through the
 * same splitLyrics used for pasted content, so an imported song behaves
 * identically to one typed in by hand.
 */
export function importSongsFromHtml(html: string): ImportedSong[] {
  const blocks = parseBlocks(html)
  const songs: ImportedSong[] = []
  let current: Draft | null = null
  // Counts only actual fallback usages, not songs.length — a document-title
  // heading or an empty section gets pushed as a draft and filtered out
  // below, but must never consume a number from the "Song 1, Song 2…"
  // sequence the operator will actually see.
  let fallbackIndex = 0

  const startSong = (boundary: Boundary | undefined) => {
    const clean = boundary?.title?.trim()
    const useReal = !!clean && !SONG_N_RE.test(clean)
    if (useReal) {
      current = { title: clean!, confidence: boundary!.confidence, lines: [] }
    } else {
      fallbackIndex++
      current = { title: `Song ${fallbackIndex}`, confidence: "low", lines: [] }
    }
  }

  const flush = () => {
    if (current) songs.push(finish(current))
    current = null
  }

  for (const block of blocks) {
    if (block.type === "table") {
      flush()
      for (const row of block.rows ?? []) {
        if (!row.some(Boolean)) continue
        const [titleCell, ...rest] = row
        const raw = rest.join("\n")
        const titleText = titleCell.trim()
        if (!titleText) fallbackIndex++
        songs.push({
          title: titleText || `Song ${fallbackIndex}`,
          titleConfidence: "low",
          groups: raw.trim() ? splitLyrics(raw) : [],
          sourceLines: rest,
        })
      }
      continue
    }

    const boundary = looksLikeSongBoundary(block)
    if (boundary) {
      flush()
      startSong(boundary)
      continue
    }

    const text = block.text.trim()
    if (!text) continue
    if (!current) startSong(undefined)
    if (!current!.scripture && isScriptureLike(text)) {
      current!.scripture = text
      continue
    }
    current!.lines.push(text)
  }
  flush()

  // A heading with nothing under it (a document title, a section divider)
  // produces an empty draft — drop it rather than importing a blank song.
  return songs.filter((s) => s.groups.length > 0 || !!s.scriptureReference)
}
