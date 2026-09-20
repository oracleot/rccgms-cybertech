import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { emitEvent } from "@/lib/telemetry"
import {
  OBS_CODE_TTL_MS,
  canGenerateObsCode,
  generateObsCode,
  getObsAccessSecret,
  hashObsCode,
} from "@/lib/obs-access"

/**
 * POST /api/admin/developer/obs-access
 * Generate a single-use OBS dock access code.
 * Access: lead_developer, developer ONLY (matches requireDeveloperOnly —
 * intentionally excludes admin). Role is verified server-side.
 *
 * The plaintext code is returned once in this response and never stored.
 */

export const runtime = "nodejs"

export async function POST() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single()

  if (!profile || !canGenerateObsCode(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const secret = getObsAccessSecret()
  if (!secret) {
    console.error("[obs-access] no OBS_ACCESS_SECRET or SUPABASE_SERVICE_ROLE_KEY configured")
    return NextResponse.json({ error: "Not configured" }, { status: 500 })
  }

  let admin
  try {
    admin = createAdminClient()
  } catch {
    return NextResponse.json({ error: "Not configured" }, { status: 500 })
  }

  // Retry on the (vanishingly rare) code_hash collision with a live code.
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateObsCode()
    const codeHash = await hashObsCode(code, secret)
    const expiresAt = new Date(Date.now() + OBS_CODE_TTL_MS)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- obs_access_codes not in generated types
    const { error } = await (admin as any).from("obs_access_codes").insert({
      code_hash: codeHash,
      created_by: profile.id,
      expires_at: expiresAt.toISOString(),
    })

    if (!error) {
      void emitEvent({
        subsystem: "auth",
        action: "obs_code_generate",
        status: "ok",
        actor_id: user.id,
      })
      return NextResponse.json({ code, expiresAt: expiresAt.toISOString() })
    }

    if (!/duplicate|unique/i.test(error.message)) {
      console.error("[obs-access] insert failed:", error.message)
      void emitEvent({
        subsystem: "auth",
        action: "obs_code_generate",
        status: "error",
        severity: "error",
        actor_id: user.id,
        metadata: { error: error.message },
      })
      return NextResponse.json({ error: "Failed to generate code" }, { status: 500 })
    }
  }

  return NextResponse.json({ error: "Failed to generate code" }, { status: 500 })
}
