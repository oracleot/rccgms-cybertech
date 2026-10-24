/**
 * Controller registry — claims controller ownership for a broadcast room.
 *
 * All writes go through POST /api/lyrics/room/claim, which:
 *  - binds new rooms to the signed-in user's active parish
 *  - lets OBS take control only after that parish-bound room exists
 *  - upserts via service role (direct client writes are revoked)
 *
 * The client never provides parish_id.
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
