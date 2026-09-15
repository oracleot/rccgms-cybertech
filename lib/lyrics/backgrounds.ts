/**
 * Shared background presets, backed by Supabase (`lyric_backgrounds`) so a
 * preset saved once is available everywhere — including the dock running
 * inside OBS's own browser profile, which can't see another browser's
 * localStorage (the same reason the song library lives in Supabase).
 *
 * Uploaded images go to the `lyric-backgrounds` Storage bucket, never into
 * settings (which broadcast over realtime and cache in localStorage) as
 * base64.
 */

import { createClient } from "@/lib/supabase/client"
import type { BackgroundMode } from "./settings"

export interface BackgroundPreset {
  id: string
  name: string
  mode: Exclude<BackgroundMode, "transparent">
  color?: string
  gradientFrom?: string
  gradientTo?: string
  gradientAngle?: number
  imageUrl?: string
}

interface PresetRow {
  id: string
  name: string
  mode: string
  color: string | null
  gradient_from: string | null
  gradient_to: string | null
  gradient_angle: number | null
  image_url: string | null
}

// The generated Database type predates these tables (codegen needs a linked
// CLI session this environment lacks). Contained to this file.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
type UntypedSupabase = { from: (t: string) => any }
function table(supabase: ReturnType<typeof createClient>) {
  return (supabase as unknown as UntypedSupabase).from("lyric_backgrounds")
}

function rowToPreset(row: PresetRow): BackgroundPreset {
  const mode = row.mode === "gradient" || row.mode === "image" ? row.mode : "solid"
  return {
    id: row.id,
    name: row.name,
    mode,
    color: row.color ?? undefined,
    gradientFrom: row.gradient_from ?? undefined,
    gradientTo: row.gradient_to ?? undefined,
    gradientAngle: row.gradient_angle ?? undefined,
    imageUrl: row.image_url ?? undefined,
  }
}

export async function loadPresets(): Promise<BackgroundPreset[]> {
  const supabase = createClient()
  try {
    const { data, error } = await table(supabase).select("*").order("created_at", { ascending: false })
    if (error) throw error
    return ((data ?? []) as PresetRow[]).map(rowToPreset)
  } catch {
    return []
  }
}

export async function savePreset(preset: Omit<BackgroundPreset, "id">): Promise<void> {
  const supabase = createClient()
  const { error } = await table(supabase).insert({
    name: preset.name,
    mode: preset.mode,
    color: preset.color ?? null,
    gradient_from: preset.gradientFrom ?? null,
    gradient_to: preset.gradientTo ?? null,
    gradient_angle: preset.gradientAngle ?? null,
    image_url: preset.imageUrl ?? null,
  })
  if (error) throw error
}

export async function deletePreset(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await table(supabase).delete().eq("id", id)
  if (error) throw error
}

/** Uploads a background image to Storage and returns its public URL. */
export async function uploadBackgroundImage(file: File): Promise<string> {
  const supabase = createClient()
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
  const path = `${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from("lyric-backgrounds").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  })
  if (error) throw error
  const { data } = supabase.storage.from("lyric-backgrounds").getPublicUrl(path)
  return data.publicUrl
}

export function subscribeToPresets(onChange: () => void): () => void {
  const supabase = createClient()
  const channel = supabase
    .channel("lyric-backgrounds-sync")
    .on("postgres_changes", { event: "*", schema: "public", table: "lyric_backgrounds" }, () => onChange())
    .subscribe()
  return () => {
    channel.unsubscribe()
  }
}
