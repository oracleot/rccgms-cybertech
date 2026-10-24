import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { getActiveParishId } from "@/lib/parish/context"
import { isValidRoomId } from "@/lib/lyrics/room"

export const runtime = "nodejs"

/**
 * POST /api/lyrics/room/claim
 *
 * Trusted server-side room controller claim. Replaces direct client-side
 * upserts to broadcast_controllers (which are now revoked by migration 051).
 *
 * Body: { roomId: string, controllerId: string }
 *
 * A signed-in parish member creates/binds a room. An anonymous OBS surface may
 * take control only of an existing parish-bound room, and can never choose or
 * replace that parish_id.
 *
 * The client NEVER provides parish_id.
 */
export async function POST(request: NextRequest) {
  let body: { roomId?: string; controllerId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { roomId, controllerId } = body
  if (!roomId || !controllerId) {
    return NextResponse.json({ error: "roomId and controllerId required" }, { status: 400 })
  }

  if (!isValidRoomId(roomId)) {
    return NextResponse.json({ error: "Invalid room ID" }, { status: 400 })
  }

  const admin = createAdminClient()

  // Try Supabase auth first
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // Resolve parish from canonical context — never trust client-provided parish_id
    const parishId = await getActiveParishId()
    if (!parishId) {
      return NextResponse.json({ error: "Choose an active parish first" }, { status: 403 })
    }

    const { data: existing, error: lookupError } = await admin
      .from("broadcast_controllers")
      .select("parish_id")
      .eq("room_id", roomId)
      .maybeSingle()

    if (lookupError) {
      return NextResponse.json({ error: "Could not verify broadcast room" }, { status: 500 })
    }
    if (existing?.parish_id && existing.parish_id !== parishId) {
      return NextResponse.json({ error: "That broadcast room belongs to another parish" }, { status: 403 })
    }

    const claim = {
      controller_id: controllerId,
      claimed_at: new Date().toISOString(),
    }
    const { error } = existing
      ? await admin
          .from("broadcast_controllers")
          .update(claim)
          .eq("room_id", roomId)
          .eq("parish_id", parishId)
      : await admin
          .from("broadcast_controllers")
          .insert({ room_id: roomId, parish_id: parishId, ...claim })

    if (error) {
      return NextResponse.json({ error: "Could not establish broadcast room" }, { status: 500 })
    }

    return NextResponse.json({ ok: true, parishId })
  }

  // No login: join only a room already created by an authenticated parish
  // member. UPDATE deliberately cannot create a new unscoped room.
  const { data: existing } = await admin
    .from("broadcast_controllers")
    .select("parish_id")
    .eq("room_id", roomId)
    .maybeSingle()
  if (!existing?.parish_id) {
    return NextResponse.json({ error: "Room not found. Create it while signed in to Fusion first." }, { status: 404 })
  }

  const { error } = await admin
    .from("broadcast_controllers")
    .update({ controller_id: controllerId, claimed_at: new Date().toISOString() })
    .eq("room_id", roomId)
    .eq("parish_id", existing.parish_id)

  if (error) {
    return NextResponse.json({ error: "Could not join broadcast room" }, { status: 500 })
  }

  return NextResponse.json({ ok: true, parishId: existing.parish_id })
}
