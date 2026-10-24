import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { getActiveParishId } from "@/lib/parish/context"
import { isValidRoomId } from "@/lib/lyrics/room"

export const runtime = "nodejs"

/**
 * GET /api/lyrics/backgrounds?room=XXXXXXXX
 *
 * Returns lyric_backgrounds scoped to a broadcast room's parish.
 *
 * Signed-in users must belong to the room's parish. OBS surfaces may read an
 * existing room; parish_id is always resolved from the server-side registry.
 */
export async function GET(request: NextRequest) {
  const roomId = request.nextUrl.searchParams.get("room")

  if (roomId) {
    if (!isValidRoomId(roomId)) {
      return NextResponse.json({ error: "Invalid room ID" }, { status: 400 })
    }

    const admin = createAdminClient()

    // Try normal Supabase auth first
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: controller } = await admin
        .from("broadcast_controllers")
        .select("parish_id")
        .eq("room_id", roomId)
        .single()

      if (!controller?.parish_id) {
        return NextResponse.json({ error: "Room not found or no parish" }, { status: 404 })
      }

      const { data: profile } = await admin
        .from("profiles")
        .select("id, role")
        .eq("auth_user_id", user.id)
        .single()

      if (profile) {
        const isDev = ["lead_developer", "developer"].includes(profile.role)
        if (!isDev) {
          const { data: membership } = await admin
            .from("parish_memberships")
            .select("parish_id")
            .eq("profile_id", profile.id)
            .eq("parish_id", controller.parish_id)
            .eq("status", "active")
            .limit(1)
            .single()

          if (!membership) {
            return NextResponse.json({ error: "Not a member of this parish" }, { status: 403 })
          }
        }

        const { data: presets } = await admin
          .from("lyric_backgrounds")
          .select("*")
          .eq("parish_id", controller.parish_id)
          .order("created_at", { ascending: false })

        return NextResponse.json({ presets: presets ?? [], parishId: controller.parish_id })
      }

      return NextResponse.json({ error: "Profile not found" }, { status: 401 })
    }

    // Anonymous OBS surface: read only the parish already bound to this room.
    const { data: controller } = await admin
      .from("broadcast_controllers")
      .select("parish_id")
      .eq("room_id", roomId)
      .single()

    if (!controller?.parish_id) {
      return NextResponse.json({ error: "Room not found or no parish" }, { status: 404 })
    }

    const { data: presets } = await admin
      .from("lyric_backgrounds")
      .select("*")
      .eq("parish_id", controller.parish_id)
      .order("created_at", { ascending: false })

    return NextResponse.json({ presets: presets ?? [], parishId: controller.parish_id })
  }

  // No room param — require full Supabase auth + membership
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const parishId = await getActiveParishId()

  if (!parishId) {
    return NextResponse.json({ presets: [] })
  }

  const admin = createAdminClient()

  const { data: presets } = await admin
    .from("lyric_backgrounds")
    .select("*")
    .eq("parish_id", parishId)
    .order("created_at", { ascending: false })

  return NextResponse.json({ presets: presets ?? [], parishId })
}
