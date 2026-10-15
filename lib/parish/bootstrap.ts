import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Returns the bootstrap (original) parish id — the earliest-created parish.
 * Used to pin legacy v1 OBS session tokens (which have no parish claim) to
 * that single parish in multi-parish mode. Requires a service-role client.
 *
 * TODO(v1-sunset): remove with v1 OBS token support.
 */
export async function getBootstrapParishId(admin: SupabaseClient): Promise<string | null> {
  const { data } = await admin
    .from("parishes")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()
  return (data?.id as string | undefined) ?? null
}
