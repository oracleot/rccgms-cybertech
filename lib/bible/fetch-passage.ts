/**
 * Fetches Bible passages from bible-api.com — free, no API key required.
 * Supports KJV, WEB (World English Bible), ASV, BBE, YLT.
 */

export const TRANSLATIONS = [
  { id: "kjv", name: "King James Version" },
  { id: "web", name: "World English Bible" },
  { id: "asv", name: "American Standard Version" },
  { id: "bbe", name: "Bible in Basic English" },
  { id: "ylt", name: "Young's Literal Translation" },
] as const

export type TranslationId = (typeof TRANSLATIONS)[number]["id"]

export interface VerseEntry {
  book: string
  chapter: number
  verse: number
  text: string
}

export interface FetchedPassage {
  reference: string
  text: string
  translationId: string
  translationName: string
  verses: VerseEntry[]
}

interface BibleApiVerse {
  book_id: string
  book_name: string
  chapter: number
  verse: number
  text: string
}

interface BibleApiResponse {
  reference: string
  text: string
  verses: BibleApiVerse[]
  translation_id: string
  translation_name: string
  error?: string
}

export async function fetchBiblePassage(
  apiPath: string,
  translation: TranslationId = "kjv"
): Promise<FetchedPassage> {
  // apiPath uses + as word separator (bible-api.com convention) — do not encode it
  const url = `https://bible-api.com/${apiPath}?translation=${translation}`
  const res = await fetch(url, { cache: "force-cache" })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  const data: BibleApiResponse = await res.json()
  if (data.error) throw new Error(data.error)
  const verses: VerseEntry[] = (data.verses ?? []).map((v) => ({
    book: v.book_name,
    chapter: v.chapter,
    verse: v.verse,
    text: v.text.trim().replace(/\n/g, " "),
  }))
  return {
    reference: data.reference,
    text: data.text.trim().replace(/\n/g, " "),
    translationId: data.translation_id,
    translationName: data.translation_name,
    verses,
  }
}
