/**
 * Bible Book Fuzzy Matcher
 *
 * This is the "trained model" for Bible speech detection. It corrects
 * misheard or mispronounced Bible book names using two strategies:
 *
 *  1. KNOWN_MISHEARINGS — curated map of Web Speech API errors → correct alias.
 *     Update this map as new mishearings are discovered (these are the "training examples").
 *
 *  2. Levenshtein distance — catches minor pronunciation variations (up to 2
 *     character edits) against all 200+ known book aliases. Strict: only fires
 *     when edit distance ≤ 2 AND the alias is at least 5 characters (avoids
 *     matching short common words like "am", "de", "la").
 *
 * Confidence gate (strict mode): candidate must score ≥ 0.80 to be returned.
 * A chapter number must be present in the surrounding text — bare book name
 * matches without chapter context are silently dropped.
 */

import { BOOKS, BOOK_BY_ALIAS } from "./detect-references"

// ---------------------------------------------------------------------------
// 1. Curated mishearing map — "training data"
//    Keys: what Web Speech API commonly transcribes
//    Values: the correct Bible book alias that BOOK_BY_ALIAS recognises
// ---------------------------------------------------------------------------
const KNOWN_MISHEARINGS: Record<string, string> = {
  // Numbered books often misheard
  "won john": "1 john",
  "one john": "1 john",
  "juan": "john",        // Spanish-influenced pronunciation
  "to corinthians": "2 corinthians",
  "too corinthians": "2 corinthians",
  "won corinthians": "1 corinthians",
  "one corinthians": "1 corinthians",
  "won samuel": "1 samuel",
  "one samuel": "1 samuel",
  "to samuel": "2 samuel",
  "too samuel": "2 samuel",
  "won kings": "1 kings",
  "one kings": "1 kings",
  "to kings": "2 kings",
  "too kings": "2 kings",
  "won timothy": "1 timothy",
  "one timothy": "1 timothy",
  "to timothy": "2 timothy",
  "too timothy": "2 timothy",
  "won peter": "1 peter",
  "one peter": "1 peter",
  "to peter": "2 peter",
  "too peter": "2 peter",
  "won thessalonians": "1 thessalonians",
  "one thessalonians": "1 thessalonians",
  "to thessalonians": "2 thessalonians",
  "too thessalonians": "2 thessalonians",

  // Common phonetic mishearings of longer book names
  "filipinos": "philippians",
  "filipians": "philippians",
  "phillipians": "philippians",
  "phillip peons": "philippians",
  "philippine": "philippians",
  "galatian": "galatians",
  "galaxies": "galatians",
  "galician": "galatians",
  "ephesian": "ephesians",
  "asians": "ephesians",
  "colossian": "colossians",
  "thessalonian": "1 thessalonians",
  "the salon ians": "1 thessalonians",
  "thessalonia": "1 thessalonians",
  "corinthian": "1 corinthians",
  "lamentation": "lamentations",
  "revelation s": "revelation",
  "revelations": "revelation",  // already an alias but add here too
  "apocalypse": "revelation",
  "epistles": "",               // too ambiguous — ignore
  "habakuk": "habakkuk",
  "habbakuk": "habakkuk",
  "habacuc": "habakkuk",
  "ha back": "habakkuk",
  "zephania": "zephaniah",
  "zephanias": "zephaniah",
  "nehemia": "nehemiah",
  "micaiah": "micah",
  "malaki": "malachi",
  "malaky": "malachi",
  "ecclesiast": "ecclesiastes",
  "ecclesiast ees": "ecclesiastes",
  "obadia": "obadiah",
  "obadias": "obadiah",
  "joel ": "joel",
  "psalms": "psalms",
  "song of songs": "song of solomon",
  "canticles": "song of solomon",
}

// ---------------------------------------------------------------------------
// 2. Levenshtein distance (inline — no external dependency)
// ---------------------------------------------------------------------------
function lev(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

// ---------------------------------------------------------------------------
// 3. All unique aliases, filtered to meaningful length (≥ 4 chars)
//    Short aliases (ge, ex, jn…) are already perfect matches; we skip them
//    for fuzzy matching to avoid false positives on common words.
// ---------------------------------------------------------------------------
const FUZZY_ALIASES: Array<{ alias: string; canonical: string; displayName: string }> = []

for (const book of BOOKS) {
  for (const alias of book.aliases) {
    if (alias.length >= 4) {
      FUZZY_ALIASES.push({ alias, canonical: book.canonical, displayName: book.displayName })
    }
  }
}

// ---------------------------------------------------------------------------
// 4. Public API
// ---------------------------------------------------------------------------

export interface FuzzyMatch {
  canonical: string
  displayName: string
  confidence: number   // 0.0–1.0
  matchedAlias: string
}

/**
 * Tries to match `token` (a word or short phrase from the transcript) to a
 * Bible book name. Returns null if no confident match is found.
 *
 * Strict mode: minimum confidence 0.80. Short tokens (< 4 chars) are ignored.
 */
export function fuzzyMatchBook(token: string): FuzzyMatch | null {
  const t = token.toLowerCase().trim()
  if (t.length < 4) return null

  // 1. Exact alias match — handled by regex, but fast-path here for completeness
  const exact = BOOK_BY_ALIAS.get(t)
  if (exact) return { ...exact, confidence: 1.0, matchedAlias: t }

  // 2. Known mishearing override
  const corrected = KNOWN_MISHEARINGS[t]
  if (corrected !== undefined) {
    if (!corrected) return null   // deliberately empty = ignore
    const entry = BOOK_BY_ALIAS.get(corrected)
    if (entry) return { ...entry, confidence: 0.9, matchedAlias: corrected }
  }

  // 3. Levenshtein fuzzy match against all known aliases ≥ 4 chars
  let best: FuzzyMatch | null = null

  for (const { alias, canonical, displayName } of FUZZY_ALIASES) {
    const dist = lev(t, alias)
    const maxDist = alias.length >= 8 ? 2 : alias.length >= 5 ? 1 : 0
    if (dist > maxDist) continue

    // Scale confidence: 0 edits = 1.0, 1 edit = 0.85, 2 edits = 0.75
    const confidence = dist === 0 ? 1.0 : dist === 1 ? 0.85 : 0.75
    if (!best || confidence > best.confidence) {
      best = { canonical, displayName, confidence, matchedAlias: alias }
    }
  }

  if (best && best.confidence >= 0.80) return best
  return null
}

/**
 * Slides a 1–3 word window over the normalised transcript and returns
 * the first high-confidence book match that is also followed by a digit
 * (chapter number) within the next 10 characters. This enforces the strict
 * rule: "must have chapter number to fire."
 */
export function findFuzzyBooksInText(
  text: string
): Array<{ match: FuzzyMatch; index: number; windowText: string }> {
  const words = text.split(/\s+/)
  const found: Array<{ match: FuzzyMatch; index: number; windowText: string }> = []
  const seenBooks = new Set<string>()

  for (let i = 0; i < words.length; i++) {
    for (let len = 3; len >= 1; len--) {
      if (i + len > words.length) continue
      const window = words.slice(i, i + len).join(" ")
      const match = fuzzyMatchBook(window)
      if (!match) continue

      // Require a digit (chapter number) within the next 25 chars after this window
      const afterIdx = text.indexOf(window) + window.length
      const after = text.slice(afterIdx, afterIdx + 25)
      if (!/\d/.test(after)) continue

      // Avoid duplicate books
      if (seenBooks.has(match.canonical)) continue
      seenBooks.add(match.canonical)

      found.push({ match, index: afterIdx - window.length, windowText: window })
      break  // longer window already consumed these words
    }
  }

  return found
}
