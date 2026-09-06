import { NextRequest, NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import {
  verifyAvailabilityEmailSchema,
  publicAvailabilitySchema,
} from "@/lib/validations/rota"
import { checkRateLimit } from "@/lib/rate-limit"

/**
 * Escape ILIKE wildcard characters so an email lookup is an exact
 * case-insensitive match, not a pattern match.
 */
function escapeForIlike(value: string): string {
  return value.replace(/[%_\\]/g, (char) => `\\${char}`)
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown"
  )
}

/**
 * GET /api/availability/public?action=verify&email=...
 *
 * Checks whether an email belongs to an existing account. Never reveals
 * *which* account - only whether one exists - so this can't be used to
 * enumerate member emails.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get("action")

  if (action !== "verify") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  }

  const ip = getClientIp(request)
  const rateLimit = checkRateLimit(`availability-verify:${ip}`, 10, 3600000) // 10/hour
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rateLimit.resetIn / 1000)) } }
    )
  }

  const email = searchParams.get("email") || ""
  const parsed = verifyAvailabilityEmailSchema.safeParse({ email })
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .ilike("email", escapeForIlike(parsed.data.email))
    .maybeSingle()

  return NextResponse.json({ exists: Boolean(data) }, { status: 200 })
}

/**
 * POST /api/availability/public
 *
 * Stores availability submitted from the public form. The email is
 * re-verified server-side before anything is written - the client-side
 * verify step is a UX convenience, not the security boundary. An unknown
 * email is rejected here even if the earlier check was bypassed.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rateLimit = checkRateLimit(`availability-submit:${ip}`, 5, 3600000) // 5/hour
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rateLimit.resetIn / 1000)) } }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const parsed = publicAvailabilitySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  // Honeypot - silently pretend success to bots
  if (parsed.data.website && parsed.data.website.length > 0) {
    return NextResponse.json({ message: "Availability saved" }, { status: 200 })
  }

  const supabase = createAdminClient()

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .ilike("email", escapeForIlike(parsed.data.email))
    .maybeSingle()

  if (!profile) {
    return NextResponse.json(
      {
        error:
          "We couldn't find an account with that email. If you're part of the team, ask your leader for an invite.",
      },
      { status: 404 }
    )
  }

  const rows = parsed.data.dates.map((date) => ({
    user_id: (profile as { id: string }).id,
    date,
    is_available: parsed.data.isAvailable,
    notes: parsed.data.isAvailable ? null : parsed.data.notes || null,
    source: "public_form",
  }))

  const { error } = await supabase
    .from("availability")
    .upsert(rows, { onConflict: "user_id,date" })

  if (error) {
    console.error("Public availability upsert error:", error)
    return NextResponse.json({ error: "Failed to save availability" }, { status: 500 })
  }

  return NextResponse.json(
    { message: `Availability saved for ${rows.length} date${rows.length > 1 ? "s" : ""}` },
    { status: 200 }
  )
}
