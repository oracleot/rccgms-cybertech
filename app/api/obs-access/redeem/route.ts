import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { checkRateLimit } from "@/lib/rate-limit"
import { emitEvent } from "@/lib/telemetry"
import {
  OBS_ACCESS_COOKIE,
  OBS_SESSION_TTL_MS,
  createObsSessionToken,
  getObsAccessSecret,
  hashObsCode,
  isCodeRowRedeemable,
  isValidObsCodeFormat,
  sanitizeDockNext,
} from "@/lib/obs-access"

/**
 * POST /api/obs-access/redeem — public.
 * Exchanges a valid, unexpired, unused 6-digit code for an OBS-dock-only
 * session cookie (12h). Every failure returns the same generic message so
 * the response never reveals which check failed; the specific reason goes
 * to developer telemetry only.
 */

export const runtime = "nodejs"

const GENERIC_ERROR = "Invalid or expired access code"
const DEFAULT_DOCK = "/lyrics/obs/dock"

function fail(status: number) {
  return NextResponse.json({ error: GENERIC_ERROR }, { status })
}

function logFailure(reason: string) {
  void emitEvent({
    subsystem: "auth",
    action: "obs_code_redeem",
    status: "error",
    severity: "warn",
    metadata: { reason },
  })
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  const { allowed } = checkRateLimit(`obs-redeem:${ip}`, 10, 15 * 60 * 1000)
  if (!allowed) {
    void emitEvent({
      subsystem: "auth",
      action: "obs_code_redeem",
      status: "rate_limited",
      severity: "warn",
    })
    return fail(429)
  }

  let code = ""
  let next: string | null = null
  try {
    const body = await request.json()
    if (typeof body.code === "string") code = body.code.trim()
    if (typeof body.next === "string") next = body.next
  } catch {
    // fall through to format check
  }

  if (!isValidObsCodeFormat(code)) {
    logFailure("malformed")
    return fail(400)
  }

  const secret = getObsAccessSecret()
  if (!secret) {
    console.error("[obs-access] no OBS_ACCESS_SECRET or SUPABASE_SERVICE_ROLE_KEY configured")
    return fail(500)
  }

  let admin
  try {
    admin = createAdminClient()
  } catch {
    return fail(500)
  }

  const codeHash = await hashObsCode(code, secret)
  const nowIso = new Date().toISOString()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- obs_access_codes not in generated types
  const { data: row, error: readError } = await (admin as any)
    .from("obs_access_codes")
    .select("id, expires_at, redeemed_at")
    .eq("code_hash", codeHash)
    .maybeSingle()

  if (readError || !row) {
    logFailure("not_found")
    return fail(400)
  }
  if (!isCodeRowRedeemable(row)) {
    logFailure(row.redeemed_at ? "already_used" : "expired")
    return fail(400)
  }

  // Atomic claim: the WHERE clause re-checks unused + unexpired inside the
  // single UPDATE, so two concurrent redemptions can never both succeed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: claimed, error: claimError } = await (admin as any)
    .from("obs_access_codes")
    .update({ redeemed_at: nowIso })
    .eq("id", row.id)
    .is("redeemed_at", null)
    .gt("expires_at", nowIso)
    .select("id")

  if (claimError || !claimed || claimed.length === 0) {
    logFailure("claim_race")
    return fail(400)
  }

  const token = await createObsSessionToken(secret)
  const redirect = sanitizeDockNext(next) ?? DEFAULT_DOCK

  const res = NextResponse.json({ redirect })
  res.cookies.set(OBS_ACCESS_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: OBS_SESSION_TTL_MS / 1000,
  })

  void emitEvent({ subsystem: "auth", action: "obs_code_redeem", status: "ok" })
  return res
}
