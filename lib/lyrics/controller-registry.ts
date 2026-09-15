/**
 * Server-side controller registry backed by the `broadcast_controllers` table.
 *
 * The dock is a public surface with no login, and controller ownership is a
 * client-side consensus via Realtime Presence — which a serverless function
 * cannot query. This registry mirrors controller claims into a table the
 * upload route can verify with the service role.
 *
 * Write path (client): `registerController` — upserts via the anonymous
 * Supabase client, which RLS allows (INSERT + UPDATE only, no SELECT/DELETE).
 *
 * Read path (server): `verifyController` — reads via the service-role admin
 * client (bypasses RLS). Returns whether the given controllerId is the
 * registered controller for the room and the claim is recent.
 */

import { createClient } from "@/lib/supabase/client"

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated Database type predates this table; untyped access contained to this file
type UntypedSupabase = { from: (t: string) => any }

function table(supabase: ReturnType<typeof createClient>) {
  return (supabase as unknown as UntypedSupabase).from("broadcast_controllers")
}

/**
 * Registers (or refreshes) a controller claim. Called from the dock whenever
 * it claims control — fire-and-forget; a failed registration means the next
 * upload will be rejected, and re-taking control retries the registration.
 */
export async function registerController(roomId: string, controllerId: string): Promise<void> {
  const supabase = createClient()
  await table(supabase).upsert(
    { room_id: roomId, controller_id: controllerId, claimed_at: new Date().toISOString() },
    { onConflict: "room_id" },
  )
}
