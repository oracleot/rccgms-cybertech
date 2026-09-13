/**
 * One place to load scripture from. Callers ask for (reference, translation)
 * and get a passage; everything about where it came from is handled here:
 *
 *  - memory cache (LRU) for instant translation switching and repeats
 *  - a bounded IndexedDB cache so a passage used last Sunday is instant too
 *  - in-flight de-duplication, so five callers for one passage make one request
 *  - a small scheduler: the passage the operator asked for always goes first,
 *    prefetches queue behind it, and a prefetch the operator then selects is
 *    promoted rather than fetched twice
 *
 * bible-api.com serves one translation per request and has no bulk endpoint,
 * so "all translations" means one request each. Some translations lack some
 * chapters (YLT has no Psalm 119); that is remembered as "unavailable", not
 * retried.
 */

import { fetchBiblePassage, TRANSLATIONS, type FetchedPassage, type TranslationId } from "./fetch-passage"

const SCHEMA = 2
const DB_NAME = "fusion-bible"
const STORE = "passages"
const TTL_MS = 30 * 24 * 60 * 60 * 1000
const MISSING_TTL_MS = 24 * 60 * 60 * 1000
const MEMORY_LIMIT = 200
const DB_LIMIT = 400
const CONCURRENCY = 2

export type Priority = "high" | "low"

export class PassageUnavailableError extends Error {
  constructor(public readonly apiPath: string, public readonly translation: TranslationId) {
    super(`Not available in ${translation.toUpperCase()}`)
    this.name = "PassageUnavailableError"
  }
}

interface Entry {
  key: string
  apiPath: string
  translation: TranslationId
  passage: FetchedPassage | null // null = confirmed missing in this translation
  savedAt: number
  lastUsed: number
}

/** "John+3:16" and " john 3:16 " are the same passage. */
export function normalizeApiPath(apiPath: string): string {
  return apiPath.trim().toLowerCase().replace(/\s+/g, "+").replace(/[–—]/g, "-")
}

const keyOf = (apiPath: string, t: TranslationId) => `${SCHEMA}:${t}:${normalizeApiPath(apiPath)}`

// ---------------------------------------------------------------- memory

const memory = new Map<string, Entry>()

function memGet(key: string): Entry | undefined {
  const e = memory.get(key)
  if (!e) return undefined
  // Re-insert to mark as most recently used
  memory.delete(key)
  e.lastUsed = Date.now()
  memory.set(key, e)
  return e
}

function memSet(e: Entry) {
  memory.delete(e.key)
  memory.set(e.key, e)
  while (memory.size > MEMORY_LIMIT) {
    const oldest = memory.keys().next().value
    if (oldest == null) break
    memory.delete(oldest)
  }
}

// ---------------------------------------------------------------- IndexedDB

let dbPromise: Promise<IDBDatabase | null> | null = null

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(null)
    try {
      const req = indexedDB.open(DB_NAME, SCHEMA)
      req.onupgradeneeded = () => {
        const db = req.result
        // Schema change: drop everything rather than migrate scripture text
        if (db.objectStoreNames.contains(STORE)) db.deleteObjectStore(STORE)
        const store = db.createObjectStore(STORE, { keyPath: "key" })
        store.createIndex("lastUsed", "lastUsed")
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
      req.onblocked = () => resolve(null)
    } catch {
      resolve(null)
    }
  })
  return dbPromise
}

async function dbGet(key: string): Promise<Entry | undefined> {
  const db = await openDb()
  if (!db) return undefined
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, "readonly")
      const req = tx.objectStore(STORE).get(key)
      req.onsuccess = () => resolve(req.result as Entry | undefined)
      req.onerror = () => resolve(undefined)
    } catch {
      resolve(undefined)
    }
  })
}

async function dbPut(e: Entry): Promise<void> {
  const db = await openDb()
  if (!db) return
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite")
      tx.objectStore(STORE).put(e)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    } catch {
      resolve()
    }
  })
  void dbTrim(db)
}

let trimming = false
async function dbTrim(db: IDBDatabase) {
  if (trimming) return
  trimming = true
  try {
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite")
      const store = tx.objectStore(STORE)
      const countReq = store.count()
      countReq.onsuccess = () => {
        const excess = countReq.result - DB_LIMIT
        if (excess <= 0) return
        // Walk least-recently-used first and delete the excess
        let left = excess
        const cur = store.index("lastUsed").openCursor()
        cur.onsuccess = () => {
          const c = cur.result
          if (!c || left <= 0) return
          c.delete()
          left--
          c.continue()
        }
      }
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    })
  } finally {
    trimming = false
  }
}

// ---------------------------------------------------------------- scheduler

interface Job {
  key: string
  apiPath: string
  translation: TranslationId
  priority: Priority
  resolve: (p: FetchedPassage) => void
  reject: (e: unknown) => void
  promise: Promise<FetchedPassage>
}

const inFlight = new Map<string, Job>()
const queue: Job[] = []
let active = 0
let activeLow = 0
/** After the API throttles us, prefetches stand down so the operator's requests get through. */
let lowPausedUntil = 0
const LOW_PAUSE_MS = 6000

function pump() {
  while (active < CONCURRENCY && queue.length) {
    const highIdx = queue.findIndex((j) => j.priority === "high")
    let idx = highIdx
    if (idx < 0) {
      // Only prefetches waiting. Keep one slot free for whatever the operator asks for
      // next, and hold off entirely while the API is throttling.
      if (activeLow >= CONCURRENCY - 1 || Date.now() < lowPausedUntil) return
      idx = 0
    }
    const job = queue.splice(idx, 1)[0]
    active++
    if (job.priority === "low") activeLow++
    void run(job).finally(() => {
      active--
      if (job.priority === "low") activeLow--
      inFlight.delete(job.key)
      pump()
    })
  }
  if (queue.length && Date.now() < lowPausedUntil) {
    setTimeout(pump, lowPausedUntil - Date.now() + 50)
  }
}

async function run(job: Job) {
  try {
    const passage = await fetchWithRetry(job.apiPath, job.translation)
    const entry: Entry = {
      key: job.key,
      apiPath: normalizeApiPath(job.apiPath),
      translation: job.translation,
      passage,
      savedAt: Date.now(),
      lastUsed: Date.now(),
    }
    memSet(entry)
    void dbPut(entry)
    if (passage) job.resolve(passage)
    else job.reject(new PassageUnavailableError(job.apiPath, job.translation))
  } catch (e) {
    job.reject(e)
  }
}

/** Returns null when the API says the passage doesn't exist in this translation. */
async function fetchWithRetry(apiPath: string, translation: TranslationId): Promise<FetchedPassage | null> {
  let delay = 800
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fetchBiblePassage(normalizeApiPath(apiPath), translation)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (/not found|API error 404/i.test(msg)) return null
      const transient = /API error (429|5\d\d)|Failed to fetch|NetworkError/i.test(msg)
      if (!transient || attempt === 2) throw e
      lowPausedUntil = Date.now() + LOW_PAUSE_MS
      await new Promise((r) => setTimeout(r, delay))
      delay *= 2
    }
  }
  return null
}

// ---------------------------------------------------------------- public API

/** Synchronous: what we already hold in memory, for instant translation switches. */
export function peekPassage(apiPath: string, translation: TranslationId): FetchedPassage | null | undefined {
  const e = memGet(keyOf(apiPath, translation))
  if (!e) return undefined
  if (Date.now() - e.savedAt > (e.passage ? TTL_MS : MISSING_TTL_MS)) return undefined
  return e.passage
}

/**
 * Load one passage in one translation. Memory → IndexedDB → network, with
 * requests de-duplicated and ordered by priority.
 */
export function loadPassage(
  apiPath: string,
  translation: TranslationId,
  priority: Priority = "high"
): Promise<FetchedPassage> {
  const key = keyOf(apiPath, translation)

  const cached = peekPassage(apiPath, translation)
  if (cached) return Promise.resolve(cached)
  if (cached === null) return Promise.reject(new PassageUnavailableError(apiPath, translation))

  const existing = inFlight.get(key)
  if (existing) {
    // The operator now wants a prefetch: move it to the front
    if (priority === "high" && existing.priority === "low") {
      existing.priority = "high"
      const i = queue.indexOf(existing)
      if (i > 0) {
        queue.splice(i, 1)
        queue.unshift(existing)
      }
    }
    return existing.promise
  }

  let resolve!: (p: FetchedPassage) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<FetchedPassage>((res, rej) => {
    resolve = res
    reject = rej
  })
  const job: Job = { key, apiPath, translation, priority, resolve, reject, promise }
  inFlight.set(key, job)

  // Check the persistent cache before spending a network request
  void dbGet(key).then((e) => {
    const fresh = e && Date.now() - e.savedAt <= (e.passage ? TTL_MS : MISSING_TTL_MS)
    if (fresh && e) {
      e.lastUsed = Date.now()
      memSet(e)
      void dbPut(e)
      inFlight.delete(key)
      if (e.passage) resolve(e.passage)
      else reject(new PassageUnavailableError(apiPath, translation))
      return
    }
    queue.push(job)
    pump()
  })

  return promise
}

/**
 * Warm the other translations for a passage the operator just loaded, behind
 * anything they ask for next. Errors (including "unavailable") are swallowed;
 * they surface only if the operator actually selects that translation.
 */
export function prefetchTranslations(apiPath: string, except: TranslationId, only?: TranslationId[]): void {
  const list = (only ?? TRANSLATIONS.map((t) => t.id)).filter((t) => t !== except)
  for (const t of list) {
    if (peekPassage(apiPath, t) !== undefined) continue
    loadPassage(apiPath, t, "low").catch(() => {})
  }
}

let deferredPrefetch: ReturnType<typeof setTimeout> | null = null

/**
 * Prefetch once the operator has paused. A short passage is warmed at once —
 * it's four small requests. A whole chapter is four large ones, and an
 * operator stepping through chapters would otherwise queue dozens; so those
 * wait until nothing new has been sent for a moment, and a newer send
 * replaces the pending one.
 */
export function prefetchTranslationsWhenIdle(apiPath: string, except: TranslationId, verseCount: number): void {
  if (deferredPrefetch) {
    clearTimeout(deferredPrefetch)
    deferredPrefetch = null
  }
  if (verseCount <= 12) {
    prefetchTranslations(apiPath, except)
    return
  }
  deferredPrefetch = setTimeout(() => {
    deferredPrefetch = null
    prefetchTranslations(apiPath, except)
  }, 1500)
}

/** Which translations already hold this passage in memory — for the dock to show what's instant. */
export function readyTranslations(apiPath: string): TranslationId[] {
  return TRANSLATIONS.map((t) => t.id).filter((t) => !!peekPassage(apiPath, t))
}
