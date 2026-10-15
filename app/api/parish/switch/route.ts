import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { ACTIVE_PARISH_COOKIE, getMyMemberships } from "@/lib/parish/context"

export const runtime = "nodejs"

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

/**
 * POST /api/parish/switch  { parishId: string }
 *
 * Sets the fusion_active_parish cookie, but only after confirming the
 * authenticated user holds an ACTIVE membership in that parish. The cookie is
 * a preference, never an authority: getActiveParishId() re-validates it
 * against parish_memberships on every request.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const parishId = (body as { parishId?: unknown } | null)?.parishId
  if (typeof parishId !== "string" || !UUID_RE.test(parishId)) {
    return NextResponse.json({ error: "Invalid parishId" }, { status: 400 })
  }

  const memberships = await getMyMemberships()
  const match = memberships.find((m) => m.parish_id === parishId)
  if (!match || !match.parish) {
    return NextResponse.json(
      { error: "You are not an active member of this parish" },
      { status: 403 },
    )
  }

  const cookieStore = await cookies()
  cookieStore.set(ACTIVE_PARISH_COOKIE, parishId, {
    httpOnly: true,
    sameSite: "lax",
    // Browsers treat localhost as a secure context, but Safari does not;
    // keep Secure everywhere except local development.
    secure: process.env.NODE_ENV !== "development",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  })

  return NextResponse.json({
    success: true,
    parish: {
      id: match.parish.id,
      name: match.parish.name,
      slug: match.parish.slug,
    },
    role: match.role,
  })
}
