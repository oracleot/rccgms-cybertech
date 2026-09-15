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

/** A background-upload failure with a machine-readable code the UI maps to a message. */
export class BackgroundUploadError extends Error {
  constructor(public code: string) {
    super(code)
    this.name = "BackgroundUploadError"
  }
}

export const MAX_BACKGROUND_BYTES = 10 * 1024 * 1024
export const ALLOWED_BACKGROUND_TYPES = ["image/jpeg", "image/png", "image/webp"]

/**
 * Uploads a background image and returns its public URL. Goes through the
 * server route (which writes with the service role), because the public dock
 * has no permission to write to Storage directly. The server verifies the
 * roomId/controllerId against the broadcast_controllers registry before
 * accepting the upload. Throws a BackgroundUploadError with a code so the
 * operator gets a specific message.
 */
export async function uploadBackgroundImage(file: File, roomId: string, controllerId: string): Promise<string> {
  if (!ALLOWED_BACKGROUND_TYPES.includes(file.type)) throw new BackgroundUploadError("UNSUPPORTED_TYPE")
  if (file.size > MAX_BACKGROUND_BYTES) throw new BackgroundUploadError("TOO_LARGE")

  const form = new FormData()
  form.append("file", file)
  form.append("roomId", roomId)
  form.append("controllerId", controllerId)

  let res: Response
  try {
    res = await fetch("/api/lyrics/background", { method: "POST", body: form })
  } catch {
    throw new BackgroundUploadError("STORAGE_UNAVAILABLE")
  }

  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
  if (!res.ok || !data.url) throw new BackgroundUploadError(data.error || "UPLOAD_FAILED")
  return data.url
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
