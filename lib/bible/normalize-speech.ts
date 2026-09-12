/**
 * Bible Speech Normalizer
 *
 * Converts Web Speech API transcripts into a form that the Bible reference
 * regex can reliably match. The speech recognizer often produces:
 *   - Number words instead of digits  ("chapter three verse sixteen")
 *   - Ordinal prefixes for numbered books  ("first corinthians")
 *   - Verbose chapter/verse markers  ("chapter thirteen verse four through seven")
 *
 * This module transforms those spoken forms into the compact format the
 * regex already understands (e.g. "1 Corinthians 13:4-7").
 */

const ONES: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19,
}
const TENS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90,
}
const ORDINALS: Record<string, number> = {
  first: 1, second: 2, third: 3, "1st": 1, "2nd": 2, "3rd": 3,
}

/** Converts up to two words representing a number into a digit. */
function wordsToNum(words: string[]): number | null {
  if (words.length === 0) return null
  const w0 = words[0].toLowerCase()
  const w1 = words[1]?.toLowerCase()

  // Ordinal form (used for chapter/verse numbers like "the first")
  if (ORDINALS[w0] !== undefined) return ORDINALS[w0]

  const t = TENS[w0]
  const o = ONES[w0]

  if (t !== undefined) {
    // "twenty three" → 23
    if (w1 && ONES[w1]) return t + ONES[w1]
    return t
  }
  if (o !== undefined) return o

  return null
}

/** Regex fragment matching 1-2 spoken number words */
const NUM_WORDS = [
  ...Object.keys(ORDINALS),
  ...Object.keys(TENS).flatMap((t) => [
    t,
    ...Object.keys(ONES).map((o) => `${t} ${o}`),
  ]),
  ...Object.keys(ONES),
].sort((a, b) => b.length - a.length)  // longest first to avoid partial matches

const NUM_WORD_RE = NUM_WORDS.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")

export function normalizeSpeechTranscript(raw: string): string {
  let s = raw

  // 1. Ordinal book prefixes: "first john" → "1 john", "second kings" → "2 kings"
  s = s.replace(
    /\b(first|second|third|1st|2nd|3rd)\b(\s+)/gi,
    (_, ord, space) => `${ORDINALS[ord.toLowerCase()] ?? ord}${space}`
  )

  // 2. "chapter <number-words-or-digit>" → bare digit
  s = s.replace(
    new RegExp(`\\bchapter\\s+(\\d+|${NUM_WORD_RE})`, "gi"),
    (match, cap) => {
      const asInt = parseInt(cap, 10)
      if (!isNaN(asInt)) return String(asInt)
      const ws = cap.trim().toLowerCase().split(/\s+/)
      const n = wordsToNum(ws)
      return n !== null ? String(n) : match
    }
  )

  // 3. "verse <number-words-or-digit>" → just the digit
  //    The regex already handles chapter<space>verse via [:\\s] — no colon needed here.
  s = s.replace(
    new RegExp(`\\bverse\\s+(\\d+|${NUM_WORD_RE})`, "gi"),
    (match, vrs) => {
      const asInt = parseInt(vrs, 10)
      if (!isNaN(asInt)) return String(asInt)
      const ws = vrs.trim().toLowerCase().split(/\s+/)
      const n = wordsToNum(ws)
      return n !== null ? String(n) : match
    }
  )

  // 4. "through/to <verse>" for ranges → "-<digit>"
  s = s.replace(
    new RegExp(`\\b(?:through|to|thru)\\s+(?:verse\\s+)?(\\d+|${NUM_WORD_RE})`, "gi"),
    (match, end) => {
      const asInt = parseInt(end, 10)
      if (!isNaN(asInt)) return `-${asInt}`
      const n = wordsToNum([end.toLowerCase()])
      return n !== null ? `-${n}` : match
    }
  )

  // 5. Compound tens+ones still in text: "twenty one" → "21"
  s = s.replace(
    /\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)\s+(one|two|three|four|five|six|seven|eight|nine)\b/gi,
    (_, tens, ones) => String((TENS[tens.toLowerCase()] ?? 0) + (ONES[ones.toLowerCase()] ?? 0))
  )

  // 6. Remaining teens + round tens
  s = s.replace(
    /\b(eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)\b/gi,
    (m) => String(ONES[m.toLowerCase()] ?? TENS[m.toLowerCase()] ?? m)
  )

  return s
}
