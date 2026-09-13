/**
 * Forgiving reference parser for what an operator actually types mid-service:
 *
 *   2kings2 3 5   → 2 Kings 2:3–5        john316      → John 3:16
 *   jn 3 16       → John 3:16            ps119 3 6    → Psalm 119:3–6
 *   1cor13 4 7    → 1 Corinthians 13:4–7 romans8 28   → Romans 8:28
 *   gen 1 31-2 3  → Genesis 1:31–2:3
 *
 * Every result carries a confidence. "high" is sent without interruption;
 * "medium" is sent but the interpretation is shown; "low" (or any result with
 * alternatives) asks the operator to confirm rather than risk showing the
 * wrong scripture on stream.
 */

import { CANON, findBook, suggestBooks, type BookInfo } from "./books"
import { fuzzyMatchBook } from "./fuzzy-books"

export type Confidence = "high" | "medium" | "low"

export interface ParsedReference {
  book: BookInfo
  chapter: number
  verse?: number
  endChapter?: number
  endVerse?: number
  /** "2 Kings 2:3–5" — en dash, as printed Bibles set ranges */
  reference: string
  /** "2+kings+2:3-5" — what bible-api.com accepts */
  apiPath: string
  confidence: Confidence
  note?: string
}

export interface ParseResult {
  best: ParsedReference | null
  /** Other readings of the same input, when it genuinely could mean more than one thing */
  alternatives: ParsedReference[]
  /** Books matching a partially typed name, for autocomplete */
  bookSuggestions: BookInfo[]
  /** True when the operator should confirm before this goes live */
  needsConfirmation: boolean
}

const MAX_VERSE = 176 // Psalm 119

function format(
  book: BookInfo,
  chapter: number,
  verse?: number,
  endChapter?: number,
  endVerse?: number
): { reference: string; apiPath: string } {
  if (verse == null) {
    return { reference: `${book.name} ${chapter}`, apiPath: `${book.canonical}+${chapter}` }
  }
  if (endChapter != null && endVerse != null && endChapter !== chapter) {
    return {
      reference: `${book.name} ${chapter}:${verse}–${endChapter}:${endVerse}`,
      apiPath: `${book.canonical}+${chapter}:${verse}-${endChapter}:${endVerse}`,
    }
  }
  if (endVerse != null && endVerse !== verse) {
    return {
      reference: `${book.name} ${chapter}:${verse}–${endVerse}`,
      apiPath: `${book.canonical}+${chapter}:${verse}-${endVerse}`,
    }
  }
  return { reference: `${book.name} ${chapter}:${verse}`, apiPath: `${book.canonical}+${chapter}:${verse}` }
}

function make(
  book: BookInfo,
  confidence: Confidence,
  chapter: number,
  verse?: number,
  endChapter?: number,
  endVerse?: number,
  note?: string
): ParsedReference {
  return { book, chapter, verse, endChapter, endVerse, confidence, note, ...format(book, chapter, verse, endChapter, endVerse) }
}

const lower = (c: Confidence, floor: Confidence): Confidence => {
  const rank = { high: 2, medium: 1, low: 0 }
  return rank[c] < rank[floor] ? c : floor
}

interface BookMatch {
  book: BookInfo
  confidence: Confidence
  note?: string
  others: BookInfo[]
}

/** Resolve the typed book text: exact alias → unique prefix → fuzzy (typos). */
function resolveBook(text: string): BookMatch | null {
  const t = text.trim().toLowerCase().replace(/\./g, "").replace(/\s+/g, " ")
  if (!t) return null
  const exact = findBook(t) ?? findBook(t.replace(/\s/g, ""))
  if (exact) return { book: exact, confidence: "high", others: [] }

  // Ordinal written out: "first john", "second kings", "iii john"
  const ord = t.match(/^(first|second|third|i{1,3})\s+(.+)$/)
  if (ord) {
    const n = { first: "1", second: "2", third: "3", i: "1", ii: "2", iii: "3" }[ord[1]]
    const b = findBook(`${n} ${ord[2]}`)
    if (b) return { book: b, confidence: "high", others: [] }
  }

  const prefixed = suggestBooks(t, 8)
  if (prefixed.length === 1) return { book: prefixed[0], confidence: "high", others: [] }
  if (prefixed.length > 1) {
    // "phil" → Philippians before Philemon: prefer the name match, then canonical order
    const byName = prefixed.filter((b) => b.name.toLowerCase().startsWith(t))
    const pick = byName[0] ?? prefixed[0]
    const same = prefixed.filter((b) => b !== pick)
    return { book: pick, confidence: "medium", note: "Book name is a partial match", others: same }
  }

  // Swapped adjacent letters — "jonh", "pslam" — before the distance pass, which
  // counts a swap as two edits and would otherwise reach for Jonah over John.
  for (let i = 0; i < t.length - 1; i++) {
    const swapped = t.slice(0, i) + t[i + 1] + t[i] + t.slice(i + 2)
    const b = findBook(swapped) ?? findBook(swapped.replace(/\s/g, ""))
    if (b) return { book: b, confidence: "medium", note: `Read "${text.trim()}" as ${b.name}`, others: [] }
  }

  // Typos: "psalsm", "revelaton"
  const fuzzy = fuzzyMatchBook(t)
  if (fuzzy) {
    const b = findBook(fuzzy.canonical)
    if (b) {
      return {
        book: b,
        confidence: fuzzy.confidence >= 0.85 ? "medium" : "low",
        note: `Read "${text.trim()}" as ${b.name}`,
        others: [],
      }
    }
  }
  return null
}

/** Ways a run of digits with no separator can split into chapter and verse. */
function splitGlued(token: string, book: BookInfo): Array<{ chapter: number; verse: number }> {
  const out: Array<{ chapter: number; verse: number }> = []
  for (let i = 1; i < token.length; i++) {
    const c = parseInt(token.slice(0, i), 10)
    const v = parseInt(token.slice(i), 10)
    if (c >= 1 && c <= book.chapters && v >= 1 && v <= MAX_VERSE && !token.slice(i).startsWith("0")) {
      out.push({ chapter: c, verse: v })
    }
  }
  return out
}

interface Numbers {
  /** number tokens before a range dash */
  left: string[]
  /** number tokens after a range dash, if any */
  right: string[] | null
  explicitColon: boolean
}

function tokenizeNumbers(s: string): Numbers | null {
  const cleaned = s.replace(/[–—]/g, "-").replace(/[,;]/g, " ").trim()
  if (!cleaned || !/^\d/.test(cleaned)) return null
  const explicitColon = cleaned.includes(":")
  const [l, r] = cleaned.split("-", 2)
  const toks = (part: string) => part.split(/[\s:.]+/).filter(Boolean)
  const left = toks(l)
  const right = r != null ? toks(r) : null
  if (!left.length || left.some((x) => !/^\d+$/.test(x)) || (right && right.some((x) => !/^\d+$/.test(x)))) {
    return null
  }
  return { left, right, explicitColon }
}

/**
 * Turn the number tokens into readings. The first reading is the preferred
 * one; more than one reading means the input is genuinely ambiguous.
 */
function readings(book: BookInfo, n: Numbers, bookConf: Confidence): ParsedReference[] {
  const { left, right } = n
  const out: ParsedReference[] = []
  const chapterOk = (c: number) => c >= 1 && c <= book.chapters
  const badChapter = (c: number) => `${book.name} has ${book.chapters} chapter${book.chapters === 1 ? "" : "s"}`

  // Resolve the left side into (chapter, verse?) candidates
  let heads: Array<{ chapter: number; verse?: number; conf: Confidence; note?: string }> = []
  if (left.length === 1) {
    const tok = left[0]
    const asChapter = parseInt(tok, 10)
    if (chapterOk(asChapter) && (!right || right.length === 1)) {
      // "ps119", "john 3", "john 21" — a lone number is a chapter when the book has one
      heads.push({ chapter: asChapter, conf: "high" })
    }
    if (!heads.length || !chapterOk(asChapter)) {
      const splits = splitGlued(tok, book)
      for (const s of splits) heads.push({ chapter: s.chapter, verse: s.verse, conf: splits.length > 1 ? "medium" : "high" })
      if (!heads.length) heads.push({ chapter: asChapter, conf: "low", note: badChapter(asChapter) })
    }
  } else if (left.length === 2) {
    const c = parseInt(left[0], 10)
    const v = parseInt(left[1], 10)
    heads.push({ chapter: c, verse: v, conf: chapterOk(c) ? "high" : "low", note: chapterOk(c) ? undefined : badChapter(c) })
  } else if (left.length === 3 && !right) {
    // "2 3 5" → 2:3–5
    const c = parseInt(left[0], 10)
    out.push(make(book, lower(bookConf, chapterOk(c) ? "high" : "low"), c, parseInt(left[1], 10), undefined, parseInt(left[2], 10), chapterOk(c) ? undefined : badChapter(c)))
    return out
  } else if (left.length === 4 && !right) {
    // "1 31 2 3" → 1:31–2:3, unusual without a dash so ask
    const c = parseInt(left[0], 10)
    out.push(make(book, lower(bookConf, "low"), c, parseInt(left[1], 10), parseInt(left[2], 10), parseInt(left[3], 10), "Read as a range across chapters"))
    return out
  } else {
    return out
  }

  for (const h of heads) {
    const conf = lower(bookConf, h.conf)
    if (!right) {
      out.push(make(book, conf, h.chapter, h.verse, undefined, undefined, h.note))
      continue
    }
    if (h.verse == null) {
      // "john 3-5": a chapter range isn't something the API serves
      out.push(make(book, "low", h.chapter, undefined, undefined, undefined, "Chapter ranges aren't supported — showing the first chapter"))
      continue
    }
    if (right.length === 1) {
      const ev = parseInt(right[0], 10)
      out.push(make(book, ev >= h.verse ? conf : lower(conf, "low"), h.chapter, h.verse, undefined, ev, ev >= h.verse ? h.note : "Range ends before it starts"))
    } else {
      // "1 31-2 3" → 1:31–2:3
      const ec = parseInt(right[0], 10)
      const ev = parseInt(right[1], 10)
      const ok = chapterOk(ec) && (ec > h.chapter || (ec === h.chapter && ev >= h.verse))
      out.push(make(book, ok ? conf : lower(conf, "low"), h.chapter, h.verse, ec, ev, ok ? h.note : badChapter(ec)))
    }
  }
  return out
}

/**
 * Parse whatever is in the reference field. Never throws; an empty or
 * unrecognisable input yields best = null and possibly book suggestions.
 */
export function parseReferenceInput(input: string): ParseResult {
  const empty: ParseResult = { best: null, alternatives: [], bookSuggestions: [], needsConfirmation: false }
  const raw = input.trim()
  if (!raw) return empty

  // Book text is everything up to the first digit that isn't a leading ordinal ("2kings", "1 cor")
  const m = raw.match(/^([1-3]?\s*[a-zA-Z][a-zA-Z .]*?)\s*(\d.*)?$/)
  if (!m) return empty
  const bookText = m[1]
  const numberText = m[2] ?? ""

  const bm = resolveBook(bookText)
  if (!bm) {
    return { ...empty, bookSuggestions: suggestBooks(bookText.replace(/\./g, "")) }
  }

  if (!numberText.trim()) {
    // Just a book so far — offer completions, nothing to send yet
    return { ...empty, bookSuggestions: [bm.book, ...bm.others].slice(0, 6) }
  }

  const nums = tokenizeNumbers(numberText)
  if (!nums) return { ...empty, bookSuggestions: [] }

  let list = readings(bm.book, nums, bm.confidence)
  if (bm.note && list.length) list = list.map((r) => ({ ...r, note: r.note ?? bm.note }))

  // A partial book match that could be several books: offer the same reading in each
  const alt: ParsedReference[] = []
  for (const other of bm.others) {
    const r = readings(other, nums, "medium")[0]
    if (r) alt.push(r)
  }

  const best = list[0] ?? null
  const alternatives = [...list.slice(1), ...alt]
  const needsConfirmation = !!best && (best.confidence === "low" || alternatives.length > 0)
  return { best, alternatives, bookSuggestions: [], needsConfirmation }
}

/** All books, for browsers and pickers. */
export { CANON }
