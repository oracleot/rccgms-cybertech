/** Client for /api/bible/search — words from a verse in, references out. */

export interface SearchHit {
  reference: string
  apiPath: string
  text: string
  translation: string
}

export class SearchUnavailableError extends Error {
  constructor(message = "Scripture search is unavailable right now") {
    super(message)
    this.name = "SearchUnavailableError"
  }
}

/** Looks like words rather than a reference: at least two alphabetic words. */
export function looksLikeSearch(text: string): boolean {
  const words = text.trim().split(/\s+/).filter((w) => /^[\p{L}'’]+$/u.test(w))
  return words.length >= 2
}

export async function searchScripture(q: string, translation: string, signal?: AbortSignal): Promise<SearchHit[]> {
  const params = new URLSearchParams({ q, translation: translation.toUpperCase(), limit: "8" })
  const res = await fetch(`/api/bible/search?${params}`, { signal })
  if (res.status === 503) throw new SearchUnavailableError()
  if (!res.ok) throw new Error(`search failed (${res.status})`)
  const data = (await res.json()) as { results: SearchHit[] }
  return data.results
}
