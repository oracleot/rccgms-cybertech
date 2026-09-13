/**
 * The 66 books in canonical order, with chapter counts. This is the single
 * source of truth for "next book", "next chapter", the scripture browser and
 * reference validation. Aliases come from the detector's table so typed and
 * spoken input agree on what a book is called.
 */

import { BOOKS } from "./detect-references"

export interface BookInfo {
  /** 0-based position in canonical order */
  index: number
  /** bible-api.com path fragment, e.g. "1+corinthians" */
  canonical: string
  /** e.g. "1 Corinthians" */
  name: string
  /** USFM id used by bible-api.com's /data endpoints, e.g. "1CO" */
  id: string
  chapters: number
  aliases: string[]
}

// USFM ids and chapter counts, in the same canonical order as BOOKS.
const META: Array<[id: string, chapters: number]> = [
  ["GEN", 50], ["EXO", 40], ["LEV", 27], ["NUM", 36], ["DEU", 34], ["JOS", 24], ["JDG", 21], ["RUT", 4],
  ["1SA", 31], ["2SA", 24], ["1KI", 22], ["2KI", 25], ["1CH", 29], ["2CH", 36], ["EZR", 10], ["NEH", 13],
  ["EST", 10], ["JOB", 42], ["PSA", 150], ["PRO", 31], ["ECC", 12], ["SNG", 8], ["ISA", 66], ["JER", 52],
  ["LAM", 5], ["EZK", 48], ["DAN", 12], ["HOS", 14], ["JOL", 3], ["AMO", 9], ["OBA", 1], ["JON", 4],
  ["MIC", 7], ["NAM", 3], ["HAB", 3], ["ZEP", 3], ["HAG", 2], ["ZEC", 14], ["MAL", 4],
  ["MAT", 28], ["MRK", 16], ["LUK", 24], ["JHN", 21], ["ACT", 28], ["ROM", 16], ["1CO", 16], ["2CO", 13],
  ["GAL", 6], ["EPH", 6], ["PHP", 4], ["COL", 4], ["1TH", 5], ["2TH", 3], ["1TI", 6], ["2TI", 4],
  ["TIT", 3], ["PHM", 1], ["HEB", 13], ["JAS", 5], ["1PE", 5], ["2PE", 3], ["1JN", 5], ["2JN", 1],
  ["3JN", 1], ["JUD", 1], ["REV", 22],
]

if (META.length !== BOOKS.length) {
  throw new Error(`books.ts: META has ${META.length} entries, BOOKS has ${BOOKS.length}`)
}

export const CANON: BookInfo[] = BOOKS.map((b, index) => ({
  index,
  canonical: b.canonical,
  name: b.displayName,
  id: META[index][0],
  chapters: META[index][1],
  aliases: b.aliases,
}))

const BY_CANONICAL = new Map(CANON.map((b) => [b.canonical, b]))
const BY_NAME = new Map(CANON.map((b) => [b.name.toLowerCase(), b]))
const BY_ALIAS = new Map<string, BookInfo>()
for (const b of CANON) for (const a of b.aliases) BY_ALIAS.set(a, b)

/** Look a book up by canonical path, display name (case-insensitive) or alias. */
export function findBook(key: string): BookInfo | undefined {
  const k = key.trim().toLowerCase()
  return BY_CANONICAL.get(k) ?? BY_NAME.get(k) ?? BY_ALIAS.get(k)
}

/**
 * bible-api.com returns "Psalms" as book_name; our table calls it "Psalm".
 * Resolve either, plus any alias, so a payload's book maps back to the canon.
 */
export function bookFromApiName(apiName: string): BookInfo | undefined {
  return findBook(apiName) ?? findBook(apiName.replace(/s$/i, ""))
}

export function nextBook(b: BookInfo): BookInfo | undefined {
  return CANON[b.index + 1]
}

export function prevBook(b: BookInfo): BookInfo | undefined {
  return CANON[b.index - 1]
}

/** Chapter after (book, chapter), continuing into the next book past the last chapter. */
export function nextChapter(b: BookInfo, chapter: number): { book: BookInfo; chapter: number } | undefined {
  if (chapter < b.chapters) return { book: b, chapter: chapter + 1 }
  const n = nextBook(b)
  return n ? { book: n, chapter: 1 } : undefined
}

/** Chapter before (book, chapter), continuing into the previous book's last chapter. */
export function prevChapter(b: BookInfo, chapter: number): { book: BookInfo; chapter: number } | undefined {
  if (chapter > 1) return { book: b, chapter: chapter - 1 }
  const p = prevBook(b)
  return p ? { book: p, chapter: p.chapters } : undefined
}

/** Books whose name or an alias starts with the typed text, in canonical order. */
export function suggestBooks(typed: string, limit = 6): BookInfo[] {
  const t = typed.trim().toLowerCase().replace(/\s+/g, " ")
  if (!t) return []
  const out: BookInfo[] = []
  for (const b of CANON) {
    const name = b.name.toLowerCase()
    if (name.startsWith(t) || name.replace(/\s/g, "").startsWith(t.replace(/\s/g, "")) || b.aliases.some((a) => a.startsWith(t))) {
      out.push(b)
      if (out.length >= limit) break
    }
  }
  return out
}
