/**
 * Local persistence for songs / prayer sets. Kept intentionally simple
 * (localStorage, capped list) for the MVP; shaped so a shared Supabase
 * library can be layered in later without changing the surrounding code —
 * callers only see loadSets/saveSets, never the storage mechanism.
 */

import type { LyricSet } from "./types"

export const SETS_KEY = "lyrics-sets"
const MAX_SETS = 80

export function loadSets(): LyricSet[] {
  try {
    const raw = window.localStorage.getItem(SETS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as LyricSet[]
  } catch {
    return []
  }
}

function persist(sets: LyricSet[]): void {
  try {
    window.localStorage.setItem(SETS_KEY, JSON.stringify(sets.slice(0, MAX_SETS)))
  } catch {
    // non-fatal: the set still applies for this session
  }
}

/** Insert or replace by id, most-recently-updated first. */
export function upsertSet(sets: LyricSet[], set: LyricSet): LyricSet[] {
  const next = [set, ...sets.filter((s) => s.id !== set.id)].sort((a, b) => b.updatedAt - a.updatedAt)
  persist(next)
  return next
}

export function removeSet(sets: LyricSet[], id: string): LyricSet[] {
  const next = sets.filter((s) => s.id !== id)
  persist(next)
  return next
}
