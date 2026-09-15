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
// A bare "Song" / "Song 1" / "Songs 5" marker — seen in real documents used
// mid-song, right before the actual singable lines start, as a divider
// rather than a real second title (the real title is usually a numbered
// line just above it). See the isBareMarker handling in the main loop.
const SONG_MARKER_RE = /^songs?\s*#?\s*\d*\.?\s*:?\s*$/i
const LEADING_NUMBER_RE = /^\d+[.,)]\s*/

// A permissive "looks like a scripture reference" gate — deliberately its own
// standalone regex, not a reuse of lib/bible's parser, so Lyrics stays
// uncoupled from the Bible module. False positives/negatives just mean the
// operator corrects it in review; nothing downstream trusts this blindly.
// Tolerates real-world punctuation: en/em-dash ranges, a trailing
// translation abbreviation ("Isaiah 6:1–3 (NIV)"), a period-as-verse-
// separator some hymnals use instead of a colon.
const SCRIPTURE_RE =
  /^(?:[1-3]\s?)?[A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?\s+\d{1,3}(?:[:.]\d{1,3}(?:[-–—]\d{1,3})?)?\.?\s*(?:\([A-Za-z]+\))?$/
// Words that fit the same shape ("Capitalised word" + number) but obviously
// aren't a Bible book, so a stray "Song 1" or "Verse 3" line isn't mistaken
// for a reading.
const NOT_A_BOOK_NAME = /^(Song|Verse|Chapter|Page|Number|No|Slide|Track|Item)$/i

// "Bible Reading" section labels, optionally prefixed with an emoji/symbol
// (📖 Bible Reading) — never content, never a title.
const READING_LABEL_RE = /^bible\s+reading:?$/i

// A paragraph that opens with a quotation mark is, in every real document
// seen, the directly-quoted text of a Bible passage following a reading
// label and reference — never a lyric. Covers straight and curly quotes.
const OPENS_WITH_QUOTE_RE = /^[“‘"']/

function isReadingLabel(text: string): boolean {
  return READING_LABEL_RE.test(text.replace(/^[^\p{L}]+/u, "").trim())
}

function looksLikeQuotedScripture(text: string): boolean {
  return OPENS_WITH_QUOTE_RE.test(text.trim())
}

/** ALL-CAPS short lines read as a title in every real document seen, bold or not — "I SEE THE LORD", "ABOVE ALL". */
function isAllCapsTitle(text: string): boolean {
  const letters = text.replace(/[^A-Za-z]/g, "")
  return letters.length >= 3 && letters === letters.toUpperCase() && text.length <= 70
}

interface Boundary {
  title: string
  confidence: "high" | "low"
  /** "Song" / "Song N" seen without a number-led title nearby — see the main loop. */
  isBareMarker?: boolean
  /**
   * "1, We are going higher" doesn't tell us whether "We are going higher"
   * is a title with lyrics still to come, or the entire song in one short
   * line (very common in a praise-chorus list) — so it's seeded as the
   * first content line too. If real lyrics do follow, this shows up as one
   * redundant extra cue at the top, visible and deletable in review; if
   * they don't, the song isn't silently empty (and would otherwise be
   * dropped by the final empty-draft filter).
   */
  seedLine?: string
}

/**
 * useBoldHeuristic is a document-level signal (see importSongsFromHtml): some
 * real documents bold every single paragraph (a whole-document formatting
 * choice, not a title marker), which would otherwise make nearly every short
 * line look like a title. Numbered lines ("1. Title", "1, Title") and
 * ALL-CAPS lines stay reliable regardless, since real body/lyric text is
 * essentially never either of those.
 */
function looksLikeSongBoundary(block: HtmlBlock, useBoldHeuristic: boolean): Boundary | null {
  const t = block.text.trim()
  if (!t) return null

  // Strongest, most common real-world signal: "1. Title", "1, Title", "13, Title".
  const numbered = t.match(/^(\d{1,3})[.,]\s*(.*)$/)
  if (numbered && numbered[2].trim().length >= 2) {
    const rest = numbered[2].trim()
    return { title: rest, confidence: "high", seedLine: rest }
  }

  if (block.type === "heading") {
    const cleaned = t.replace(LEADING_NUMBER_RE, "").trim() || t
    return { title: cleaned, confidence: SONG_N_RE.test(t) ? "low" : "high" }
  }

  if (SONG_MARKER_RE.test(t)) return { title: t, confidence: "low", isBareMarker: true }
  if (isAllCapsTitle(t)) return { title: t, confidence: "high" }

  if (block.type === "paragraph" && block.bold && useBoldHeuristic && t.length <= 60 && t.split(/\s+/).length <= 8) {
    return { title: t, confidence: "high" }
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
 * Detects song boundaries from, in priority order: a numbered line ("1.
 * Title", "1, Title" — the most common real pattern seen), a real Word
 * heading, an ALL-CAPS short line, a bare "Song"/"Song N" divider, and —
 * only when this document doesn't bold every paragraph indiscriminately —
 * a short bold paragraph. Excludes "Bible Reading" labels and the directly-
 * quoted scripture text that follows them; routes an actual reference line
 * to metadata instead of the lyric text; and splits each song's remaining
 * lines into broadcast-sized cues through the same splitLyrics used for
 * pasted content, so an imported song behaves identically to one typed in
 * by hand. A trailing pass (mergeFlatNumberedRuns) catches the case where
 * the numbered lines aren't separate song titles at all but a flat list —
 * a praise/chorus medley — and combines them into one set.
 */
export function importSongsFromHtml(html: string): ImportedSong[] {
  const blocks = parseBlocks(html)

  const paragraphs = blocks.filter((b) => b.type === "paragraph")
  const boldParagraphs = paragraphs.filter((b) => b.bold)
  // Some real documents bold every paragraph as a whole-document formatting
  // choice — there, "is this paragraph bold" says nothing about whether
  // it's a title, so that signal is disabled and the numbered-line/
  // ALL-CAPS signals (reliable either way) carry the detection instead.
  const useBoldHeuristic = paragraphs.length === 0 || boldParagraphs.length / paragraphs.length < 0.6

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
    const lines = boundary?.seedLine ? [boundary.seedLine] : []
    if (useReal) {
      current = { title: clean!, confidence: boundary!.confidence, lines }
    } else {
      fallbackIndex++
      current = { title: `Song ${fallbackIndex}`, confidence: "low", lines }
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

    const text = block.text.trim()
    if (!text) continue

    // Never content, never a title — the reading label and the directly-
    // quoted scripture text that follows it in real documents.
    if (isReadingLabel(text) || looksLikeQuotedScripture(text)) continue

    const boundary = looksLikeSongBoundary(block, useBoldHeuristic)
    if (boundary) {
      // A bare "Song" / "Song N" seen mid-song (the real title was already
      // captured a line or two earlier) is a divider, not a second song —
      // only treat it as a boundary when nothing is open yet.
      if (boundary.isBareMarker && current) continue
      flush()
      startSong(boundary)
      continue
    }

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
  const withContent = songs.filter((s) => s.groups.length > 0 || !!s.scriptureReference)
  return mergeFlatNumberedRuns(withContent)
}

/**
 * A run of "songs" that each turned out to be exactly the numbered line
 * that started them — nothing more followed before the next number — is a
 * flat numbered list (a praise/chorus medley), not a sequence of one-line
 * songs. Three or more in a row is treated as one set, one cue per line,
 * so the operator advances through it as a medley instead of hunting
 * through a dozen near-empty entries in the picker. A short, non-numbered
 * title immediately before the run (a "Praise." heading with nothing else
 * under it) is absorbed as the set's name.
 */
function mergeFlatNumberedRuns(songs: ImportedSong[]): ImportedSong[] {
  const MIN_RUN = 3
  const isFlatCandidate = (s: ImportedSong) => s.sourceLines.length === 1 && s.sourceLines[0].trim() === s.title.trim()

  const out: ImportedSong[] = []
  let i = 0
  while (i < songs.length) {
    if (!isFlatCandidate(songs[i])) {
      out.push(songs[i])
      i++
      continue
    }
    let j = i
    while (j < songs.length && isFlatCandidate(songs[j])) j++
    const run = songs.slice(i, j)
    if (run.length < MIN_RUN) {
      out.push(...run)
      i = j
      continue
    }

    let title = `Imported list (${run.length} items)`
    const prev = out[out.length - 1]
    if (prev && prev.sourceLines.length <= 1 && prev.groups.length <= 1 && !/^\d/.test(prev.title)) {
      out.pop()
      // prev.title may just be the "Song N" fallback label — prefer its
      // actual text (e.g. "Praise.") when there is any.
      const absorbedText = (prev.sourceLines[0] ?? prev.title).replace(/[.:]\s*$/, "").trim()
      title = absorbedText || title
    }
    out.push({
      title,
      titleConfidence: "low",
      groups: run.flatMap((s) => s.groups),
      sourceLines: run.flatMap((s) => s.sourceLines),
    })
    i = j
  }
  return out
}
