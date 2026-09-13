/**
 * Recent passages, favourites and the queue — references only, never Bible
 * text — kept in localStorage so they survive the dock being reopened.
 * Every function returns a new value; nothing here touches the DOM.
 */

import { normalizeApiPath } from "./passage-store"

export interface ListItem {
  apiPath: string
  reference: string
  at: number
}

export interface DockLists {
  recent: ListItem[]
  favourites: ListItem[]
  queue: ListItem[]
}

const KEY = "bible-dock-lists"
const RECENT_MAX = 30
const QUEUE_MAX = 50

export const EMPTY_LISTS: DockLists = { recent: [], favourites: [], queue: [] }

export function loadLists(): DockLists {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return EMPTY_LISTS
    const p = JSON.parse(raw) as Partial<DockLists>
    const clean = (xs: unknown): ListItem[] =>
      Array.isArray(xs)
        ? xs.filter((x): x is ListItem => !!x && typeof x.apiPath === "string" && typeof x.reference === "string")
        : []
    return { recent: clean(p.recent), favourites: clean(p.favourites), queue: clean(p.queue) }
  } catch {
    return EMPTY_LISTS
  }
}

export function saveLists(l: DockLists): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(l))
  } catch {
    // non-fatal
  }
}

const same = (a: ListItem, b: { apiPath: string }) => normalizeApiPath(a.apiPath) === normalizeApiPath(b.apiPath)

export function pushRecent(l: DockLists, item: { apiPath: string; reference: string }): DockLists {
  const recent = [{ ...item, at: Date.now() }, ...l.recent.filter((r) => !same(r, item))].slice(0, RECENT_MAX)
  return { ...l, recent }
}

export function isFavourite(l: DockLists, apiPath: string): boolean {
  return l.favourites.some((f) => same(f, { apiPath }))
}

export function toggleFavourite(l: DockLists, item: { apiPath: string; reference: string }): DockLists {
  const favourites = isFavourite(l, item.apiPath)
    ? l.favourites.filter((f) => !same(f, item))
    : [...l.favourites, { ...item, at: Date.now() }]
  return { ...l, favourites }
}

export function enqueue(l: DockLists, item: { apiPath: string; reference: string }): DockLists {
  if (l.queue.length >= QUEUE_MAX) return l
  return { ...l, queue: [...l.queue, { ...item, at: Date.now() }] }
}

export function removeQueued(l: DockLists, index: number): DockLists {
  return { ...l, queue: l.queue.filter((_, i) => i !== index) }
}

export function moveQueued(l: DockLists, index: number, delta: -1 | 1): DockLists {
  const j = index + delta
  if (j < 0 || j >= l.queue.length) return l
  const queue = [...l.queue]
  ;[queue[index], queue[j]] = [queue[j], queue[index]]
  return { ...l, queue }
}

export function clearRecent(l: DockLists): DockLists {
  return { ...l, recent: [] }
}

export function timeAgo(at: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - at) / 1000))
  if (s < 60) return "just now"
  const m = Math.round(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  const d = Math.round(h / 24)
  return d === 1 ? "yesterday" : `${d} days ago`
}
