/**
 * Controller registry — claims controller ownership for a broadcast room.
 *
 * All writes go through POST /api/lyrics/room/claim, which:
 *  - validates auth (Supabase session OR OBS access cookie)
 *  - resolves parish_id server-side from membership (never from client)
 *  - upserts via service role (direct client writes are revoked)
 *
 * Fire-and-forget: a failed registration means the next upload is rejected,
 * and re-taking control retries.
 */

export async function registerController(roomId: string, controllerId: string): Promise<void> {
  try {
    await fetch("/api/lyrics/room/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, controllerId }),
    })
  } catch {
    // fire-and-forget
  }
}
