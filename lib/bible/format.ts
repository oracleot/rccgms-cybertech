// book/chapter are optional: the OBS dock stays open for hours, so mid-deploy it
// can receive a payload broadcast by an older client that predates these fields.
export interface VerseLike {
  book?: string
  chapter?: number
  verse: number
}

/**
 * Stable identity for a verse within a passage: "Genesis|1|2". Verse numbers
 * alone repeat across chapter boundaries (Genesis 1:1–2:3 has two verse 1s),
 * so focus, page lookup and highlighting must never compare by number.
 * Translation-independent, so a selection survives a translation switch.
 */
export function verseId(v: VerseLike): string {
  return `${v.book ?? ""}|${v.chapter ?? ""}|${v.verse}`
}

/** "1:2" — the label shown beside each verse in navigation lists. */
export function verseLabel(v: VerseLike): string {
  return v.chapter == null ? String(v.verse) : `${v.chapter}:${v.verse}`
}

/** "John 3:16-18" → "John 3:16–18" — en dash between verse numbers, as printed Bibles set ranges. */
export function normalizeReference(reference: string): string {
  return reference.replace(/(\d)\s*-\s*(\d)/g, "$1–$2")
}

/**
 * Reference for a run of consecutive verses — "John 3:16–18", or
 * "Genesis 1:31–2:2" across a chapter boundary. Null if the verses
 * carry no book/chapter (payload from an older client).
 */
export function rangeReference(verses: VerseLike[]): string | null {
  if (!verses.length) return null
  const a = verses[0]
  const b = verses[verses.length - 1]
  if (!a.book || a.chapter == null || b.chapter == null) return null
  if (a.chapter === b.chapter) {
    return a.verse === b.verse
      ? `${a.book} ${a.chapter}:${a.verse}`
      : `${a.book} ${a.chapter}:${a.verse}–${b.verse}`
  }
  return `${a.book} ${a.chapter}:${a.verse}–${b.chapter}:${b.verse}`
}

/**
 * The reference to show on screen. When a single verse is selected this
 * narrows the passage reference to that verse — "Psalms 23" becomes
 * "Psalms 23:3" — matching how projection software cites scripture.
 */
export function displayReference(
  reference: string,
  verseNumber?: number,
  verses?: VerseLike[],
  focusId?: string
): string {
  if (!verses?.length) return reference
  const v =
    (focusId ? verses.find((x) => verseId(x) === focusId) : undefined) ??
    (verseNumber != null ? verses.find((x) => x.verse === verseNumber) : undefined)
  if (!v?.book || v.chapter == null) return reference
  return `${v.book} ${v.chapter}:${v.verse}`
}
