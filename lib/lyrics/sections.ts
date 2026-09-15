/**
 * Turns pasted song/hymn text into sections — Verse 1, Chorus, Bridge — where
 * the text actually says so, and leaves it alone where it doesn't.
 *
 * The rule throughout is: recognise confidently or not at all. A heading is
 * only a heading when the line is *nothing but* a heading ("Chorus", "Verse
 * 2:", "V3", "Chorus x2"), because a lyric can easily contain the word
 * "bridge" and guessing wrong silently rewrites someone's song. Anything
 * unrecognised stays exactly as pasted, in an unlabelled section the operator
 * can type over — no text is ever dropped or reordered on a guess.
 */

import { splitLyrics } from "./parse"
import {
  newSectionId,
  type ContentType,
  type LyricSection,
  type SectionType,
} from "./types"

/** Heading word -> section type. Longest/most specific spellings first. */
const HEADING_WORDS: Array<{ re: RegExp; type: SectionType }> = [
  { re: /^pre[-\s]?chorus$/i, type: "prechorus" },
  { re: /^(chorus|ch)$/i, type: "chorus" },
  { re: /^(verse|vs?)$/i, type: "verse" },
  { re: /^(bridge|br)$/i, type: "bridge" },
  { re: /^refrain$/i, type: "refrain" },
  { re: /^intro(duction)?$/i, type: "intro" },
  { re: /^interlude$/i, type: "interlude" },
  { re: /^outro$/i, type: "outro" },
  { re: /^tag$/i, type: "tag" },
  { re: /^ending$/i, type: "ending" },
]

const REPEAT_WORDS: Record<string, number> = { twice: 2, thrice: 3 }

/** Trailing repeat notation on a heading — "Chorus x2", "Chorus (×2)", "Chorus repeat twice". */
function stripRepeat(text: string): { text: string; repeat?: number } {
  const t = text.trim()
  let m = t.match(/^(.*?)\s*\(\s*[x×]\s*(\d+)\s*\)\s*$/i)
  if (m) return { text: m[1].trim(), repeat: Number(m[2]) }
  m = t.match(/^(.*?)\s+(?:[x×]\s*(\d+)|(\d+)\s*[x×])\s*$/i)
  if (m) return { text: m[1].trim(), repeat: Number(m[2] ?? m[3]) }
  m = t.match(/^(.*?)[,.]?\s+repeat(?:\s+(?:(\d+)\s+times?|(twice|thrice)))?\s*$/i)
  if (m) {
    const n = m[2] ? Number(m[2]) : m[3] ? REPEAT_WORDS[m[3].toLowerCase()] : 2
    return { text: m[1].trim(), repeat: n }
  }
  return { text: t }
}

export interface ParsedHeading {
  type: SectionType
  number?: number
  label?: string
  repeat?: number
}

/**
 * Reads a line as a section heading, or returns null.
 *
 * Deliberately strict: the whole line must be the heading. "Verse 1" and
 * "Chorus:" qualify; "Verse 1 of the song we sang" does not, and neither does
 * a lyric line that happens to start with "Bridge".
 */
export function parseHeading(line: string): ParsedHeading | null {
  const raw = line.trim()
  if (!raw || raw.length > 40) return null

  // A heading may end with a colon and may carry repeat notation.
  const withoutColon = raw.replace(/[:.–-]\s*$/, "").trim()
  const { text, repeat } = stripRepeat(withoutColon)
  if (!text) return null

  // A bare number on its own line is how many hymn sheets mark a verse.
  // Checked before the word form, which requires a leading letter.
  if (/^\d{1,2}$/.test(text)) return { type: "verse", number: Number(text) }

  // "Verse 2", "V2", "Chorus 1" — word plus optional number.
  const m = text.match(/^([A-Za-z][A-Za-z\s-]*?)\s*(\d{1,2})?$/)
  if (!m) return null
  const word = m[1].trim()
  const number = m[2] ? Number(m[2]) : undefined

  for (const { re, type } of HEADING_WORDS) {
    if (re.test(word)) {
      const h: ParsedHeading = { type }
      if (number !== undefined) h.number = number
      if (repeat !== undefined) h.repeat = repeat
      return h
    }
  }

  return null
}

/** A bare "1" / "2." line, used as a verse marker in hymn sheets. */
function bareVerseNumber(line: string): number | null {
  const m = line.trim().match(/^(\d{1,2})[.)]?$/)
  return m ? Number(m[1]) : null
}

export interface ParseSectionsResult {
  sections: LyricSection[]
  /** True when at least one real heading was recognised — the caller shows structure only then. */
  recognised: boolean
}

/**
 * Splits pasted text into sections at recognised headings.
 *
 * Text before the first heading is kept in its own unlabelled section rather
 * than being attached to whatever comes after it or thrown away — if someone
 * pastes a song whose first verse has no heading, those words must survive.
 *
 * When nothing is recognised, the result is a single unlabelled section
 * holding the whole paste. The caller can then treat the song as flat, which
 * is exactly what pre-V2 sets look like.
 */
export function parseSections(raw: string, type: ContentType = "song"): ParseSectionsResult {
  const lines = raw.replace(/\r\n/g, "\n").split("\n")

  interface Draft {
    heading: ParsedHeading | null
    lines: string[]
  }
  const drafts: Draft[] = []
  let current: Draft = { heading: null, lines: [] }
  let recognised = false

  const flush = () => {
    if (current.heading || current.lines.some((l) => l.trim())) drafts.push(current)
  }

  for (const line of lines) {
    const heading = parseHeading(line)
    // A bare number only starts a verse when it's a hymn-style marker, i.e.
    // there is already content above it or it opens the paste.
    const bare = heading ? null : bareVerseNumber(line)

    if (heading || bare !== null) {
      recognised = true
      flush()
      current = {
        heading: heading ?? { type: "verse", number: bare! },
        lines: [],
      }
      continue
    }
    current.lines.push(line)
  }
  flush()

  const numbering = new Map<SectionType, number>()
  const sections: LyricSection[] = drafts.map((d) => {
    const text = d.lines.join("\n").trim()
    const groups = text ? splitLyrics(text) : []
    const h = d.heading

    if (!h) {
      return { id: newSectionId(), type: "other" as SectionType, groups }
    }

    // Verses number themselves in order when the paste didn't say, so
    // "Verse / Verse / Verse" reads 1, 2, 3 rather than all blank.
    let number = h.number
    if (number === undefined && h.type === "verse") {
      number = (numbering.get("verse") ?? 0) + 1
    }
    if (number !== undefined) numbering.set(h.type, Math.max(numbering.get(h.type) ?? 0, number))

    const section: LyricSection = { id: newSectionId(), type: h.type, groups }
    if (number !== undefined) section.number = number
    if (h.label) section.label = h.label
    if (h.repeat !== undefined) section.repeat = h.repeat
    return section
  })

  // A hymn is followed verse by verse by a congregation, so each verse goes
  // to the screen whole rather than as one cue per line — that is the whole
  // difference between hymn mode and song mode, and it applies however the
  // verses were recognised (numbered markers or blank-line blocks).
  if (type === "hymn" && recognised) {
    return {
      recognised,
      sections: sections.filter((s) => s.groups.length > 0).map(collapseSectionToVerseCue),
    }
  }

  // Hymns with no headings at all still read verse-by-verse: blank-line
  // blocks are the verses.
  if (!recognised && type === "hymn") {
    const blocks = raw
      .replace(/\r\n/g, "\n")
      .split(/\n\s*\n/)
      .map((b) => b.trim())
      .filter(Boolean)
    if (blocks.length > 1) {
      return {
        recognised: true,
        sections: blocks.map((block, i) => ({
          id: newSectionId(),
          type: "verse" as SectionType,
          number: i + 1,
          // A hymn verse is projected whole, so the block is one cue rather
          // than being chopped into phrase cues the way a song would be.
          groups: [{ id: `${newSectionId()}c`, primary: block.split("\n").map((l) => l.trim()).join("\n") }],
        })),
      }
    }
  }

  return { sections: sections.filter((s) => s.groups.length > 0), recognised }
}

/**
 * A hymn verse goes to the screen whole — congregations read a verse, they
 * don't follow phrase-by-phrase cues — so each section collapses to a single
 * cue holding all its lines.
 */
export function collapseSectionToVerseCue(section: LyricSection): LyricSection {
  if (!section.groups.length) return section
  const lines = section.groups.flatMap((g) => g.primary.split("\n"))
  return {
    ...section,
    groups: [{ id: section.groups[0].id, primary: lines.join("\n"), repeat: section.repeat }],
  }
}
