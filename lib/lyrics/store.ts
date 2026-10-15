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
import { defaultPresentation, normalizeContentType, type LyricSet, type Presentation } from "./types"

const CACHE_KEY_PREFIX = "lyrics-sets-cache"
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
  /** V2 columns — absent on rows written before migration 045. */
  sections?: unknown
  language?: string | null
  presentation?: unknown
}

// The generated Database type predates this table; codegen needs a linked
// CLI session this environment doesn't have. Contained to this one file.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above: lyric_sets isn't in the generated Database type yet
type UntypedSupabase = { from: (table: string) => any }

function table(supabase: ReturnType<typeof createClient>) {
  return (supabase as unknown as UntypedSupabase).from("lyric_sets")
}

/**
 * A row is valid whether or not it has V2 structure. `groups` is read exactly
 * as before and stays the projection list; `sections` only adds the authoring
 * view on top when the row has one. A pre-V2 flat set therefore loads and
 * plays identically after this change — nothing needs reimporting.
 */
function rowToSet(row: LyricSetRow): LyricSet {
  const type = normalizeContentType(row.type === "prayer" ? "prayer" : row.type)
  const sections = Array.isArray(row.sections) ? (row.sections as LyricSet["sections"]) : undefined
  return {
    id: row.id,
    type,
    title: row.title,
    groups: Array.isArray(row.groups) ? (row.groups as LyricSet["groups"]) : [],
    sections: sections?.length ? sections : undefined,
    language: row.language ?? undefined,
    presentation: normalizePresentation(row.presentation, type),
    updatedAt: new Date(row.updated_at).getTime(),
    scriptureReference: row.scripture_reference ?? undefined,
  }
}

function normalizePresentation(raw: unknown, type: LyricSet["type"]): Presentation {
  const base = defaultPresentation(type)
  if (!raw || typeof raw !== "object") return base
  const p = raw as Partial<Presentation>
  return {
    sectionLabels:
      p.sectionLabels === "all" || p.sectionLabels === "numbers" || p.sectionLabels === "off"
        ? p.sectionLabels
        : base.sectionLabels,
    verseNumberStyle:
      p.verseNumberStyle === "heading" ||
      p.verseNumberStyle === "inline" ||
      p.verseNumberStyle === "superscript" ||
      p.verseNumberStyle === "none"
        ? p.verseNumberStyle
        : base.verseNumberStyle,
  }
}

function cacheKey(parishId?: string): string {
  return parishId ? `${CACHE_KEY_PREFIX}-${parishId}` : CACHE_KEY_PREFIX
}

function readCache(parishId?: string): LyricSet[] {
  try {
    const raw = window.localStorage.getItem(cacheKey(parishId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as LyricSet[]) : []
  } catch {
    return []
  }
}

function writeCache(sets: LyricSet[], parishId?: string): void {
  try {
    window.localStorage.setItem(cacheKey(parishId), JSON.stringify(sets))
  } catch {
    // non-fatal: Supabase stays the source of truth either way
  }
}

/** Instant paint while the real fetch is in flight — same-profile only, never a source of truth. */
export function loadCachedSets(parishId?: string): LyricSet[] {
  return readCache(parishId)
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
export async function syncSets(parishId?: string): Promise<{ sets: LyricSet[]; source: SetsSource }> {
  const supabase = createClient()
  try {
    await migrateLegacyLocalSets(supabase)
    let query = table(supabase).select("*").order("updated_at", { ascending: false })
    if (parishId) {
      query = query.eq("parish_id", parishId)
    }
    const { data, error } = await query
    if (error) throw error
    const sets = ((data ?? []) as LyricSetRow[]).map(rowToSet)
    writeCache(sets, parishId)
    return { sets, source: "remote" }
  } catch {
    return { sets: readCache(parishId), source: "cache" }
  }
}

/**
 * Fetch lyric sets via the server API, scoped to a broadcast room's parish.
 * Used by the OBS dock when it has no authenticated Supabase session (OBS
 * access code users). The API uses the service role to bypass RLS and
 * returns only the room's parish data.
 */
export async function syncSetsForRoom(roomId: string): Promise<{ sets: LyricSet[]; source: SetsSource; parishId: string | null }> {
  try {
    const res = await fetch(`/api/lyrics/sets?room=${encodeURIComponent(roomId)}`)
    if (!res.ok) return { sets: readCache(), source: "cache", parishId: null }
    const data = await res.json()
    const parishId: string | null = data.parishId ?? null
    const sets = ((data.sets ?? []) as LyricSetRow[]).map(rowToSet)
    writeCache(sets, parishId ?? undefined)
    return { sets, source: "remote", parishId }
  } catch {
    return { sets: readCache(), source: "cache", parishId: null }
  }
}

export async function saveSet(set: LyricSet, parishId: string): Promise<void> {
  const supabase = createClient()
  const row: Record<string, unknown> = {
    id: set.id,
    type: set.type,
    title: set.title,
    groups: set.groups,
    sections: set.sections ?? null,
    language: set.language ?? null,
    presentation: set.presentation ?? null,
    scripture_reference: set.scriptureReference ?? null,
    parish_id: parishId,
  }
  const { error } = await table(supabase).upsert(row)
  if (error) throw error
}

export async function deleteSet(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await table(supabase).delete().eq("id", id)
  if (error) throw error
}

/**
 * Realtime: any client's create/edit/delete reaches every other open client.
 * When parishId is provided, only changes to that parish's sets trigger onChange.
 * Returns an unsubscribe function.
 *
 * NOTE: postgres_changes requires an authenticated session (RLS SELECT).
 * OBS/anonymous callers should NOT call this — they use polling via the API.
 */
export function subscribeToSets(onChange: () => void, parishId?: string): () => void {
  const supabase = createClient()
  const filter = parishId ? `parish_id=eq.${parishId}` : undefined
  const channel = supabase
    .channel(parishId ? `lyrics-sets-sync-${parishId}` : "lyrics-sets-sync")
    .on("postgres_changes", { event: "*", schema: "public", table: "lyric_sets", ...(filter ? { filter } : {}) }, () => onChange())
    .subscribe()
  return () => {
    channel.unsubscribe()
  }
}
