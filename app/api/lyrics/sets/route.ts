import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { OBS_ACCESS_COOKIE, verifyObsSessionToken, getObsAccessSecret } from "@/lib/obs-access"
import { getActiveParishId } from "@/lib/parish/context"

export const runtime = "nodejs"

/**
 * GET /api/lyrics/sets?room=XXXXXXXX
 *
 * Returns lyric_sets scoped to a broadcast room's parish.
 *
 * Authentication required — one of:
 *  1. Valid Supabase session + membership in the room's parish
 *  2. Valid OBS access session cookie (fusion_obs_access)
 *
 * Anonymous internet callers without either credential get 401.
 */
export async function GET(request: NextRequest) {
  const roomId = request.nextUrl.searchParams.get("room")

  if (roomId) {
    if (!/^[A-Z2-9]{8}$/.test(roomId)) {
      return NextResponse.json({ error: "Invalid room ID" }, { status: 400 })
    }

    // Try normal Supabase auth first
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // Authenticated path: verify parish membership
      const admin = createAdminClient()

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
        .select("id")
        .eq("auth_user_id", user.id)
        .single()

      if (profile) {
        const { data: membership } = await admin
          .from("parish_memberships")
          .select("parish_id")
          .eq("profile_id", profile.id)
          .eq("parish_id", controller.parish_id)
          .eq("status", "active")
          .limit(1)
          .single()

        if (membership) {
          const { data: sets } = await admin
            .from("lyric_sets")
            .select("*")
            .eq("parish_id", controller.parish_id)
            .order("updated_at", { ascending: false })

          return NextResponse.json({ sets: sets ?? [], parishId: controller.parish_id })
        }
      }

      // Authenticated but not a member of this room's parish
      // Check if platform developer
      const { data: devProfile } = await admin
        .from("profiles")
        .select("role")
        .eq("auth_user_id", user.id)
        .single()

      if (devProfile && ["lead_developer", "developer"].includes(devProfile.role)) {
        const { data: sets } = await admin
          .from("lyric_sets")
          .select("*")
          .eq("parish_id", controller.parish_id)
          .order("updated_at", { ascending: false })

        return NextResponse.json({ sets: sets ?? [], parishId: controller.parish_id })
      }

      return NextResponse.json({ error: "Not a member of this parish" }, { status: 403 })
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
    const valid = await verifyObsSessionToken(obsCookie, secret)
    if (!valid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // OBS session valid — return room-scoped data without parishId
    const admin = createAdminClient()

    const { data: controller } = await admin
      .from("broadcast_controllers")
      .select("parish_id")
      .eq("room_id", roomId)
      .single()

    if (!controller?.parish_id) {
      return NextResponse.json({ error: "Room not found or no parish" }, { status: 404 })
    }

    const { data: sets } = await admin
      .from("lyric_sets")
      .select("*")
      .eq("parish_id", controller.parish_id)
      .order("updated_at", { ascending: false })

    return NextResponse.json({ sets: sets ?? [] })
  }

  // No room param — require full Supabase auth + membership
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const parishId = await getActiveParishId()

  if (!parishId) {
    return NextResponse.json({ sets: [] })
  }

  const admin = createAdminClient()

  const { data: sets } = await admin
    .from("lyric_sets")
    .select("*")
    .eq("parish_id", parishId)
    .order("updated_at", { ascending: false })

  return NextResponse.json({ sets: sets ?? [], parishId })
}
