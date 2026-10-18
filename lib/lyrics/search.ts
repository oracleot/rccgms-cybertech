import type { LyricSet } from "./types"

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()
}

function editDistanceAtMostOne(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0, j = 0, edits = 0
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue }
    if (++edits > 1) return false
    if (a.length > b.length) i++
    else if (b.length > a.length) j++
    else { i++; j++ }
  }
  return edits + (i < a.length || j < b.length ? 1 : 0) <= 1
}

/** Match titles and complete lyric text, including phrases split across cue lines. */
export function lyricSearchScore(set: LyricSet, query: string): number {
  const normalizedQuery = normalize(query)
  if (!normalizedQuery) return 0
  const title = normalize(set.title)
  const lyrics = normalize(set.groups.map((group) => `${group.primary} ${group.secondary ?? ""}`).join(" "))
  const haystack = `${title} ${lyrics}`
  if (title.includes(normalizedQuery)) return 100
  if (lyrics.includes(normalizedQuery)) return 90
  const terms = [...new Set(normalizedQuery.split(" ").filter(Boolean))]
  if (!terms.length) return 0
  const words = [...new Set(haystack.split(" "))]
  const wordSet = new Set(words)
  const matched = terms.filter((term) => wordSet.has(term) || (term.length >= 5 && words.some((word) => editDistanceAtMostOne(term, word)))).length
  const coverage = matched / terms.length
  const threshold = terms.length === 1 ? 1 : terms.length <= 3 ? 0.67 : 0.6
  if (coverage < threshold) return 0
  const titleWords = new Set(title.split(" "))
  const titleHits = terms.filter((term) => titleWords.has(term)).length
  return Math.round(coverage * 70 + titleHits * 4)
}

export function matchesLyricSearch(set: LyricSet, query: string): boolean {
  return !normalize(query) || lyricSearchScore(set, query) > 0
}
