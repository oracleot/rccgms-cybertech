import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { OBS_ACCESS_COOKIE, verifyObsSessionToken, getObsAccessSecret } from "@/lib/obs-access"
import { getActiveParishId } from "@/lib/parish/context"
import { getBootstrapParishId } from "@/lib/parish/bootstrap"

export const runtime = "nodejs"

/**
 * POST /api/lyrics/room/claim
 *
 * Trusted server-side room controller claim. Replaces direct client-side
 * upserts to broadcast_controllers (which are now revoked by migration 051).
 *
 * Body: { roomId: string, controllerId: string }
 *
 * Authentication:
 *  - Supabase session: parish_id is resolved server-side from membership
 *  - OBS access cookie: controller claim is accepted but parish_id is preserved
 *    (not overwritten) so an earlier authenticated claim's parish binding stands
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

  if (!/^[A-Z2-9]{8}$/.test(roomId)) {
    return NextResponse.json({ error: "Invalid room ID" }, { status: 400 })
  }

  const admin = createAdminClient()

  // Try Supabase auth first
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // Resolve parish from canonical context — never trust client-provided parish_id
    const parishId = await getActiveParishId()

    await admin
      .from("broadcast_controllers")
      .upsert(
        {
          room_id: roomId,
          controller_id: controllerId,
          claimed_at: new Date().toISOString(),
          ...(parishId ? { parish_id: parishId } : {}),
        },
        { onConflict: "room_id" },
      )

    return NextResponse.json({ ok: true })
  }

  // No Supabase session — check OBS access cookie
  const obsCookie = request.cookies.get(OBS_ACCESS_COOKIE)?.value
  if (!obsCookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const secret = getObsAccessSecret()
  if (!secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  // Legacy v1 tokens have no parish claim: pin them to the bootstrap parish
  // only (looked up lazily, so v2 tokens never pay for the query).
  // TODO(v1-sunset): remove with v1 token support.
  const isLegacyV1 = obsCookie.startsWith("v1.")
  const bootstrapParishId = isLegacyV1 ? await getBootstrapParishId(admin) : null
  const obsResult = await verifyObsSessionToken(obsCookie, secret, new Date(), bootstrapParishId)
  if (!obsResult.valid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // A v1 token (pinned to the bootstrap parish) must never claim a room that
  // is already bound to a different parish.
  if (isLegacyV1 && obsResult.parishId) {
    const { data: existing } = await admin
      .from("broadcast_controllers")
      .select("parish_id")
      .eq("room_id", roomId)
      .maybeSingle()
    if (existing?.parish_id && existing.parish_id !== obsResult.parishId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  // OBS session: use the parish_id embedded in the v2 token (or the bootstrap
  // parish for v1) if available, otherwise preserve an existing parish
  // binding on the room.
  let parishId = obsResult.parishId ?? null
  if (!parishId) {
    const { data: existing } = await admin
      .from("broadcast_controllers")
      .select("parish_id")
      .eq("room_id", roomId)
      .maybeSingle()
    parishId = existing?.parish_id ?? null
  }

  await admin
    .from("broadcast_controllers")
    .upsert(
      {
        room_id: roomId,
        controller_id: controllerId,
        claimed_at: new Date().toISOString(),
        ...(parishId ? { parish_id: parishId } : {}),
      },
      { onConflict: "room_id" },
    )

  return NextResponse.json({ ok: true })
}
