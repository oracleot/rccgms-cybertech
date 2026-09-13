/**
 * Scripture text search — "for God so loved" → John 3:16.
 *
 * bible-api.com has no search, so this proxies bolls.life's phrase search,
 * a free third-party service with no SLA: short timeout, a small in-memory
 * cache, and an honest 503 when it's down. It is also the seam for swapping
 * in a bundled public-domain text later without touching the dock.
 */

import { NextResponse } from "next/server"
import { CANON } from "@/lib/bible/books"

export const runtime = "nodejs"

const PROVIDER = "bolls.life"
const TIMEOUT_MS = 4500
const CACHE_TTL_MS = 10 * 60 * 1000
const CACHE_MAX = 200
const SUPPORTED = new Set(["KJV", "WEB", "ASV", "BBE", "YLT"])

interface BollsHit {
  book: number
  chapter: number
  verse: number
  text: string
}

export interface SearchHit {
  reference: string
  apiPath: string
  text: string
  translation: string
}

const cache = new Map<string, { at: number; hits: SearchHit[] }>()

function clean(html: string): string {
  return html
    .replace(/<S>\d+<\/S>/g, "")
    .replace(/<\/?mark>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const q = (url.searchParams.get("q") ?? "").trim().replace(/\s+/g, " ")
  const translation = (url.searchParams.get("translation") ?? "KJV").toUpperCase()
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") ?? "8", 10) || 8, 1), 20)

  if (q.length < 3 || q.length > 120 || !/^[\p{L}\p{N}\s'’,.;:!?-]+$/u.test(q)) {
    return NextResponse.json({ error: "query must be 3–120 characters of text" }, { status: 400 })
  }
  const t = SUPPORTED.has(translation) ? translation : "KJV"
  const key = `${t}|${q.toLowerCase()}|${limit}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return NextResponse.json({ results: hit.hits, provider: PROVIDER, cached: true })
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const upstream = await fetch(
      `https://bolls.life/find/${t}?search=${encodeURIComponent(q)}&match_case=false&match_whole=false&limit=${limit}`,
      { signal: controller.signal, headers: { accept: "application/json" }, cache: "no-store" }
    )
    if (!upstream.ok) throw new Error(`upstream ${upstream.status}`)
    const raw = (await upstream.json()) as unknown
    const list: BollsHit[] = Array.isArray(raw) ? raw : []
    const hits: SearchHit[] = []
    for (const h of list) {
      const book = CANON[h.book - 1]
      if (!book) continue
      hits.push({
        reference: `${book.name} ${h.chapter}:${h.verse}`,
        apiPath: `${book.canonical}+${h.chapter}:${h.verse}`,
        text: clean(h.text),
        translation: t,
      })
      if (hits.length >= limit) break
    }
    cache.set(key, { at: Date.now(), hits })
    if (cache.size > CACHE_MAX) {
      const oldest = cache.keys().next().value
      if (oldest != null) cache.delete(oldest)
    }
    return NextResponse.json({ results: hits, provider: PROVIDER })
  } catch (e) {
    const reason = e instanceof Error && e.name === "AbortError" ? "timed out" : "unavailable"
    return NextResponse.json({ error: `search ${reason}`, provider: PROVIDER }, { status: 503 })
  } finally {
    clearTimeout(timer)
  }
}
