import type { ParsedLyrics } from "@/types/rundown"

/**
 * Parse lyrics text into verses
 * Verses are separated by double newlines (\n\n)
 */
export function parseLyrics(text: string | null | undefined): ParsedLyrics {
  if (!text || text.trim() === "") {
    return { verses: [] }
  }

  // Split by double newlines, filter out empty verses
  const verseTexts = text
    .split(/\n\n+/)
    .map((verse) => verse.trim())
    .filter((verse) => verse.length > 0)

  return {
    verses: verseTexts.map((content, index) => ({
      index,
      content,
    })),
  }
}

/**
 * Get a specific verse by index
 */
export function getVerse(
  lyrics: ParsedLyrics,
  index: number
): string | undefined {
  return lyrics.verses[index]?.content
}

/**
 * Get the total number of verses
 */
export function getVerseCount(lyrics: ParsedLyrics): number {
  return lyrics.verses.length
}

/**
 * Check if lyrics have multiple verses
 */
export function hasMultipleVerses(lyrics: ParsedLyrics): boolean {
  return lyrics.verses.length > 1
}

/**
 * Format lyrics for display with verse markers
 * Useful for showing a structured view with "Verse 1:", "Verse 2:", etc.
 */
export function formatLyricsWithMarkers(lyrics: ParsedLyrics): string {
  if (lyrics.verses.length === 0) {
    return ""
  }

  return lyrics.verses
    .map((verse, idx) => `Verse ${idx + 1}:\n${verse.content}`)
    .join("\n\n")
}
