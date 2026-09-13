/**
 * Structured Bible references from speech.
 *
 * The raw transcript is only ever input to detection — it is never sent to
 * the Bible API. This module finds where a book is named in the flow of
 * speech, collects the numbers spoken after it, and hands that span to the
 * same parser the typed reference field uses, so "John three sixteen",
 * "John 316" and a typed "john316" all become the one canonical John 3:16.
 */

import { CANON } from "./books"
import { normalizeSpeechTranscript } from "./normalize-speech"
import { fuzzyMatchBook } from "./fuzzy-books"
import { parseReferenceInput, type Confidence } from "./parse-reference"

export interface VoiceReference {
  book: string
  chapter: number
  startVerse?: number
  endVerse?: number
  endChapter?: number
  /** "John 3:16" */
  reference: string
  /** what the Bible API is asked for — only ever this, never the transcript */
  apiPath: string
  confidence: Confidence
  /** the words this came from, for diagnostics */
  span: string
}

const ONES: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19,
}
const TENS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
}

// Spoken aliases: at least three letters, so "am", "is", "ex" in ordinary speech never fire.
const SPOKEN_ALIASES = CANON.flatMap((b) =>
  b.aliases.filter((a) => a.replace(/^\d\s*/, "").length >= 3).map((a) => ({ alias: a, book: b }))
).sort((a, b) => b.alias.length - a.alias.length)

const ALIAS_RE = new RegExp(
  `\\b(${SPOKEN_ALIASES.map((a) => a.alias.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")).join("|")})\\b`,
  "gi"
)

// Tokens allowed inside a spoken reference between the book and the last number.
const FILLER = new Set(["verse", "verses", "chapter", "and", "the"])

/** "one nineteen" after Psalm is 119, not 1:19 — the one place hundreds are spoken that way. */
function psalmHundreds(s: string): string {
  return s.replace(
    /\b(psalms?)\s+one\s+(?:hundred\s+(?:and\s+)?)?(ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty)(?:\s+(one|two|three|four|five|six|seven|eight|nine))?\b/gi,
    (_, book: string, a: string, b?: string) => {
      const n = 100 + (ONES[a.toLowerCase()] ?? TENS[a.toLowerCase()] ?? 0) + (b ? ONES[b.toLowerCase()] ?? 0 : 0)
      return `${book} ${n}`
    }
  )
}

/** Collect the numeric run spoken after a book name, converting number words. */
function numberSpan(words: string[]): { text: string; consumed: number } {
  const out: string[] = []
  let i = 0
  let pendingTens: number | null = null
  const flushTens = () => {
    if (pendingTens != null) {
      out.push(String(pendingTens))
      pendingTens = null
    }
  }
  for (; i < words.length; i++) {
    const w = words[i].toLowerCase().replace(/[,.;!?]+$/, "")
    if (!w) continue
    if (/^\d+(-\d+)?$/.test(w) || w === "-") {
      flushTens()
      out.push(w)
      continue
    }
    if (/^-\d+$/.test(w)) {
      flushTens()
      out.push(w)
      continue
    }
    if (TENS[w] != null) {
      flushTens()
      pendingTens = TENS[w]
      continue
    }
    if (ONES[w] != null) {
      if (pendingTens != null && ONES[w] < 10) {
        out.push(String(pendingTens + ONES[w]))
        pendingTens = null
      } else {
        flushTens()
        out.push(String(ONES[w]))
      }
      continue
    }
    if (FILLER.has(w)) continue
    break
  }
  flushTens()
  // A range dash the normaliser produced ("-5") binds to the previous number
  const text = out.join(" ").replace(/\s+-\s*/g, "-").replace(/\s+-(\d)/g, "-$1")
  return { text, consumed: i }
}

/**
 * Find every Bible reference spoken in a transcript, in order, de-duplicated.
 * Book names may be misheard; a fuzzy match lowers confidence rather than
 * dropping the reference, so the operator still sees a suggestion to confirm.
 */
export function detectVoiceReferences(rawTranscript: string): VoiceReference[] {
  const text = normalizeSpeechTranscript(psalmHundreds(rawTranscript))
  const results: VoiceReference[] = []
  const seen = new Set<string>()

  const consider = (bookText: string, after: string, spanStart: string, fuzzyPenalty: boolean) => {
    const words = after.split(/\s+/).filter(Boolean)
    const { text: nums, consumed } = numberSpan(words)
    if (!nums) return
    const parsed = parseReferenceInput(`${bookText} ${nums}`)
    const best = parsed.best
    if (!best || best.chapter < 1) return
    let confidence: Confidence = best.confidence
    if (fuzzyPenalty && confidence === "high") confidence = "medium"
    if (parsed.needsConfirmation) confidence = "low"
    if (seen.has(best.reference)) return
    seen.add(best.reference)
    results.push({
      book: best.book.name,
      chapter: best.chapter,
      startVerse: best.verse,
      endVerse: best.verse != null ? best.endVerse ?? best.verse : undefined,
      endChapter: best.endChapter,
      reference: best.reference,
      apiPath: best.apiPath,
      confidence,
      span: `${spanStart} ${words.slice(0, consumed).join(" ")}`.trim(),
    })
  }

  // 1. Books named exactly (or by a known alias)
  const exactRanges: Array<[number, number]> = []
  ALIAS_RE.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = ALIAS_RE.exec(text)) !== null) {
    exactRanges.push([m.index, m.index + m[0].length])
    const after = text.slice(m.index + m[0].length)
    consider(m[0], after, m[0], false)
  }

  // 2. Books misheard: slide a 1–2 word window and fuzzy-match, requiring digits to follow.
  //    Words already claimed by an exact match are skipped — otherwise "in john" reads as
  //    1 John and the "kings" of "2 kings" reads as 1 Kings.
  const tokens: Array<{ word: string; start: number; end: number }> = []
  const wordRe = /\S+/g
  let w: RegExpExecArray | null
  while ((w = wordRe.exec(text)) !== null) tokens.push({ word: w[0], start: w.index, end: w.index + w[0].length })
  const claimed = (t: { start: number; end: number }) => exactRanges.some(([s, e]) => t.start < e && t.end > s)

  for (let i = 0; i < tokens.length; i++) {
    for (let len = 2; len >= 1; len--) {
      const slice = tokens.slice(i, i + len)
      if (slice.length < len || slice.some(claimed)) continue
      const window = slice.map((t) => t.word).join(" ").replace(/[,.;!?]+$/, "")
      if (window.length < 4) continue
      const fm = fuzzyMatchBook(window)
      if (!fm || fm.confidence >= 1) continue
      const rest = tokens.slice(i + len).map((t) => t.word).join(" ")
      if (!/^\s*(?:verse\s+|chapter\s+)?\d/.test(rest) && !/^\s*(one|two|three|four|five|six|seven|eight|nine|ten)\b/i.test(rest)) continue
      consider(fm.matchedAlias, rest, window, true)
      break
    }
  }

  return results
}
