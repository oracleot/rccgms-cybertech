/**
 * Shared song/prayer-set library, backed by Supabase (`lyric_sets`) so it's
 * visible to every client — critically, to an OBS Browser Source, which runs
 * inside OBS's own embedded Chromium (CEF) with a storage profile completely
 * separate from the operator's normal browser. Verified directly: a value
 * written to localStorage in one real browser profile is invisible in
 * another profile on the same machine, same origin — the exact failure a
 * localStorage-only library would hit between "/lyrics" (operator's Chrome)
 * and "/lyrics/obs/dock" (inside OBS).
 *
 * localStorage is kept only as a same-profile cache: it paints instantly on
 * load and is the fallback if Supabase can't be reached, but it is never the
 * only place a set lives. Supabase Realtime (`postgres_changes` on
 * lyric_sets) is what actually keeps every open client in sync without a
 * manual reload — entirely separate from the lyrics-obs / bible-obs
 * broadcast channels, which only ever carry the single live item.
 */

import { createClient } from "@/lib/supabase/client"
import type { LyricSet } from "./types"

const CACHE_KEY = "lyrics-sets-cache"
const LEGACY_KEY = "lyrics-sets"
const MIGRATED_FLAG = "lyrics-sets-migrated-to-supabase"

export type SetsSource = "remote" | "cache"

interface LyricSetRow {
  id: string
  type: string
  title: string
  groups: unknown
  updated_at: string
  scripture_reference: string | null
}

// The generated Database type predates this table; codegen needs a linked
// CLI session this environment doesn't have. Contained to this one file.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above: lyric_sets isn't in the generated Database type yet
type UntypedSupabase = { from: (table: string) => any }

function table(supabase: ReturnType<typeof createClient>) {
  return (supabase as unknown as UntypedSupabase).from("lyric_sets")
}

function rowToSet(row: LyricSetRow): LyricSet {
  return {
    id: row.id,
    type: row.type === "prayer" ? "prayer" : "lyrics",
    title: row.title,
    groups: Array.isArray(row.groups) ? (row.groups as LyricSet["groups"]) : [],
    updatedAt: new Date(row.updated_at).getTime(),
    scriptureReference: row.scripture_reference ?? undefined,
  }
}

function readCache(): LyricSet[] {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as LyricSet[]) : []
  } catch {
    return []
  }
}

function writeCache(sets: LyricSet[]): void {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(sets))
  } catch {
    // non-fatal: Supabase stays the source of truth either way
  }
}

/** Instant paint while the real fetch is in flight — same-profile only, never a source of truth. */
export function loadCachedSets(): LyricSet[] {
  return readCache()
}

/**
 * One-time, best-effort: if this browser has sets from before the library
 * moved to Supabase and the table is still empty, push them up so a set
 * someone already built isn't silently lost. Never overwrites existing
 * remote data.
 */
async function migrateLegacyLocalSets(supabase: ReturnType<typeof createClient>): Promise<void> {
  try {
    if (window.localStorage.getItem(MIGRATED_FLAG)) return
    window.localStorage.setItem(MIGRATED_FLAG, "1")
    const legacyRaw = window.localStorage.getItem(LEGACY_KEY)
    if (!legacyRaw) return
    const legacy = JSON.parse(legacyRaw) as LyricSet[]
    if (!Array.isArray(legacy) || !legacy.length) return
    const { count } = await table(supabase).select("id", { count: "exact", head: true })
    if (count && count > 0) return
    await table(supabase).insert(
      legacy.map((s) => ({ id: s.id, type: s.type, title: s.title, groups: s.groups, scripture_reference: s.scriptureReference ?? null }))
    )
  } catch {
    // best-effort only — a failed migration just means the old local sets stay local
  }
}

/** Fetch the live library. Falls back to the local cache if Supabase can't be reached. */
export async function syncSets(): Promise<{ sets: LyricSet[]; source: SetsSource }> {
  const supabase = createClient()
  try {
    await migrateLegacyLocalSets(supabase)
    const { data, error } = await table(supabase).select("*").order("updated_at", { ascending: false })
    if (error) throw error
    const sets = ((data ?? []) as LyricSetRow[]).map(rowToSet)
    writeCache(sets)
    return { sets, source: "remote" }
  } catch {
    return { sets: readCache(), source: "cache" }
  }
}

export async function saveSet(set: LyricSet): Promise<void> {
  const supabase = createClient()
  const { error } = await table(supabase).upsert({
    id: set.id,
    type: set.type,
    title: set.title,
    groups: set.groups,
    scripture_reference: set.scriptureReference ?? null,
  })
  if (error) throw error
}

export async function deleteSet(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await table(supabase).delete().eq("id", id)
  if (error) throw error
}

/** Realtime: any client's create/edit/delete reaches every other open client. Returns an unsubscribe function. */
export function subscribeToSets(onChange: () => void): () => void {
  const supabase = createClient()
  const channel = supabase
    .channel("lyrics-sets-sync")
    .on("postgres_changes", { event: "*", schema: "public", table: "lyric_sets" }, () => onChange())
    .subscribe()
  return () => {
    channel.unsubscribe()
  }
}
