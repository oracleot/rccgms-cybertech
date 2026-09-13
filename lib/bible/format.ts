// book/chapter are optional: the OBS dock stays open for hours, so mid-deploy it
// can receive a payload broadcast by an older client that predates these fields.
export interface VerseLike {
  book?: string
  chapter?: number
  verse: number
}

/** "1:2" — the label shown beside each verse in navigation lists. */
export function verseLabel(v: VerseLike): string {
  return v.chapter == null ? String(v.verse) : `${v.chapter}:${v.verse}`
}

/**
 * The reference to show on screen. When a single verse is selected this
 * narrows the passage reference to that verse — "Psalms 23" becomes
 * "Psalms 23:3" — matching how projection software cites scripture.
 */
export function displayReference(
  reference: string,
  verseNumber?: number,
  verses?: VerseLike[]
): string {
  if (verseNumber == null || !verses?.length) return reference
  const v = verses.find((x) => x.verse === verseNumber)
  if (!v?.book || v.chapter == null) return reference
  return `${v.book} ${v.chapter}:${v.verse}`
}
