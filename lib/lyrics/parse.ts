/**
 * Turns a pasted block of text into display groups. The operator never
 * enters lyrics or prayer points one line at a time — they paste the whole
 * song or list and this does the first pass; everything it produces can
 * still be edited, split, merged and reordered afterwards.
 */

import { newGroupId, type LyricGroup } from "./types"

/**
 * A cue at or under this many words is left whole — this is a readability
 * target for broadcast-sized captions ("one short phrase, or two short
 * lines"), not a hard rule, so it stays generous enough that ordinary short
 * lines are never chopped for no reason.
 */
const MAX_PHRASE_WORDS = 7

function blocksOf(raw: string): string[][] {
  const lines = raw.replace(/\r\n/g, "\n").split("\n")
  const blocks: string[][] = []
  let cur: string[] = []
  for (const line of lines) {
    const t = line.trim()
    if (!t) {
      if (cur.length) {
        blocks.push(cur)
        cur = []
      }
      continue
    }
    cur.push(t)
  }
  if (cur.length) blocks.push(cur)
  return blocks
}

const REPEAT_WORDS: Record<string, number> = { twice: 2, thrice: 3 }

/**
 * Strips trailing repeat notation — x2, ×2, (x2), 2x, "repeat twice",
 * "repeat 2 times" — and returns the count separately, so "We are going
 * higher x2" becomes one cue with repeat metadata instead of two duplicate
 * cues (or a stray "x2" hanging off the visible text).
 */
function extractRepeat(line: string): { text: string; repeat?: number } {
  const t = line.trim()
  let m = t.match(/^(.*?)\s*\(\s*[x×]\s*(\d+)\s*\)\s*$/i)
  if (m) return { text: m[1].trim(), repeat: Number(m[2]) }
  m = t.match(/^(.*?)\s+(?:[x×]\s*(\d+)|(\d+)\s*[x×])\s*$/i)
  if (m) return { text: m[1].trim(), repeat: Number(m[2] ?? m[3]) }
  m = t.match(/^(.*?)[,.]?\s+repeat\s+(?:(\d+)\s+times?|(twice|thrice))\s*$/i)
  if (m) {
    const n = m[2] ? Number(m[2]) : REPEAT_WORDS[m[3].toLowerCase()]
    return { text: m[1].trim(), repeat: n }
  }
  return { text: t }
}

const CONJUNCTIONS = /^(and|but|or|so|then|for)$/i

/**
 * Breaks one long line into broadcast-caption-sized phrases, preferring
 * commas and conjunctions as break points over a raw word count — "you live
 * and move and have my being" splits at "and", not mid-clause. A line at or
 * under MAX_PHRASE_WORDS is returned whole: this is a readability split, not
 * "every 7th word", so short lines are never touched.
 */
function segmentIntoPhrases(text: string): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length <= MAX_PHRASE_WORDS) return [words.join(" ")]

  const mid = words.length / 2
  const candidates: number[] = []
  words.forEach((w, i) => {
    if (/[,;]$/.test(w)) candidates.push(i + 1)
  })
  words.forEach((w, i) => {
    if (i > 0 && CONJUNCTIONS.test(w)) candidates.push(i)
  })

  // Nearest candidate to the midpoint wins; a tie prefers the later one, so
  // the first half fills toward the target rather than falling short of it.
  let splitAt: number
  if (candidates.length) {
    splitAt = candidates.reduce((best, c) => {
      const dc = Math.abs(c - mid)
      const db = Math.abs(best - mid)
      return dc < db || (dc === db && c > best) ? c : best
    })
  } else {
    splitAt = Math.round(mid)
  }
  // Never leave a one-word orphan on either side.
  splitAt = Math.max(2, Math.min(words.length - 2, splitAt))

  return [...segmentIntoPhrases(words.slice(0, splitAt).join(" ")), ...segmentIntoPhrases(words.slice(splitAt).join(" "))]
}

interface Phrase {
  text: string
  repeat?: number
}

/** Packs consecutive phrases two-to-a-cue — the same couplet rule as before phrase segmentation existed. */
function packPhrases(phrases: Phrase[]): LyricGroup[] {
  const groups: LyricGroup[] = []
  let i = 0
  while (i < phrases.length) {
    const a = phrases[i]
    const b = phrases[i + 1]
    // A repeat marker belongs to one phrase; pairing it with a neighbour
    // would leave it ambiguous which line the ×N actually applies to.
    if (b && !a.repeat && !b.repeat) {
      groups.push({ id: newGroupId(), primary: `${a.text}\n${b.text}` })
      i += 2
    } else {
      groups.push({ id: newGroupId(), primary: a.text, repeat: a.repeat })
      i += 1
    }
  }
  return groups
}

/**
 * Blank line = new slide boundary. Within a block, each line is broken into
 * broadcast-sized phrases (segmentIntoPhrases) and consecutive short
 * phrases pack two-to-a-cue — this is what keeps a long paragraph from
 * dumping onto the screen as one giant slide, per an explicit correction:
 * a lyric cue should read like a worship-caption phrase the operator
 * advances through, not a whole line or verse at once.
 *
 * With pairTranslation on, lines alternate primary/secondary instead, one
 * cue per pair. These are deliberately NOT phrase-segmented: there's no
 * reliable way to infer which words of a translation correspond to which
 * half of a split original-language phrase, and showing a translation that
 * doesn't match the primary text above it is worse than leaving a long pair
 * as one cue for the operator to split manually if needed.
 */
export function splitLyrics(raw: string, opts?: { pairTranslation?: boolean }): LyricGroup[] {
  const groups: LyricGroup[] = []
  for (const block of blocksOf(raw)) {
    if (opts?.pairTranslation) {
      for (let i = 0; i < block.length; i += 2) {
        const { text, repeat } = extractRepeat(block[i])
        groups.push({ id: newGroupId(), primary: text, secondary: block[i + 1], repeat })
      }
      continue
    }

    const phrases: Phrase[] = []
    for (const line of block) {
      const { text, repeat } = extractRepeat(line)
      const segments = segmentIntoPhrases(text)
      segments.forEach((seg, i) => {
        phrases.push({ text: seg, repeat: i === segments.length - 1 ? repeat : undefined })
      })
    }
    groups.push(...packPhrases(phrases))
  }
  return groups
}

const LIST_MARKER = /^(\d+[.)]|[-*•])\s+/

/**
 * A numbered or bulleted list becomes one point per marker, with any
 * unmarked follow-on lines folded into the point above (a point that wraps
 * across lines in the paste). Without markers, falls back to blank-line
 * blocks, one point per block.
 */
export function splitPrayerPoints(raw: string): LyricGroup[] {
  const lines = raw.replace(/\r\n/g, "\n").split("\n")
  const hasMarkers = lines.some((l) => LIST_MARKER.test(l.trim()))

  if (hasMarkers) {
    const points: string[] = []
    for (const line of lines) {
      const t = line.trim()
      if (!t) continue
      if (LIST_MARKER.test(t)) points.push(t.replace(LIST_MARKER, ""))
      else if (points.length) points[points.length - 1] = `${points[points.length - 1]} ${t}`
      else points.push(t)
    }
    return points.filter(Boolean).map((p) => ({ id: newGroupId(), primary: p }))
  }

  return blocksOf(raw).map((block) => ({ id: newGroupId(), primary: block.join(" ") }))
}

export function splitContent(raw: string, type: "lyrics" | "prayer", opts?: { pairTranslation?: boolean }): LyricGroup[] {
  return type === "prayer" ? splitPrayerPoints(raw) : splitLyrics(raw, opts)
}

/** Combine two groups into one, primary lines stacked, secondaries joined. */
export function mergeGroups(a: LyricGroup, b: LyricGroup): LyricGroup {
  const primary = [a.primary, b.primary].filter(Boolean).join("\n")
  const secondary = [a.secondary, b.secondary].filter(Boolean).join(" ")
  return { id: newGroupId(), primary, secondary: secondary || undefined }
}

/** Split one group roughly in half — at an existing line break if there is one, else at a word boundary. */
export function splitGroup(g: LyricGroup): [LyricGroup, LyricGroup] | null {
  const lines = g.primary.split("\n")
  if (lines.length > 1) {
    const mid = Math.ceil(lines.length / 2)
    return [
      { id: newGroupId(), primary: lines.slice(0, mid).join("\n") },
      { id: newGroupId(), primary: lines.slice(mid).join("\n") },
    ]
  }
  const words = g.primary.split(" ").filter(Boolean)
  if (words.length < 2) return null
  const mid = Math.ceil(words.length / 2)
  return [
    { id: newGroupId(), primary: words.slice(0, mid).join(" ") },
    { id: newGroupId(), primary: words.slice(mid).join(" ") },
  ]
}
