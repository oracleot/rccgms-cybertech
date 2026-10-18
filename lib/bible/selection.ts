/** Toggle one verse while preserving the canonical passage order. */
export function toggleOrderedSelection<T>(
  all: readonly T[],
  selected: readonly T[],
  item: T,
  key: (value: T) => string
): T[] | null {
  const id = key(item)
  const isSelected = selected.some((value) => key(value) === id)
  if (isSelected && selected.length === 1) return null
  return isSelected
    ? selected.filter((value) => key(value) !== id)
    : all.filter((value) => selected.some((current) => key(current) === key(value)) || key(value) === id)
}

/** Select the inclusive ordered range between an anchor verse and a clicked verse. */
export function rangeOrderedSelection<T>(
  all: readonly T[],
  anchor: T,
  item: T,
  key: (value: T) => string
): T[] | null {
  const start = all.findIndex((value) => key(value) === key(anchor))
  const end = all.findIndex((value) => key(value) === key(item))
  if (start < 0 || end < 0) return null
  return all.slice(Math.min(start, end), Math.max(start, end) + 1)
}

/** Return the chapter request and verse number represented by a single-verse API path. */
export function singleVerseChapterRequest(apiPath: string): { chapterPath: string; verse: number } | null {
  const match = apiPath.match(/^(.+\+\d+):(\d+)$/)
  if (!match) return null
  return { chapterPath: match[1], verse: Number(match[2]) }
}
