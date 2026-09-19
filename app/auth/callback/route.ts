import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { readNext } from "@/lib/auth/next-url"

/**
 * Auth callback route for handling Supabase redirects
 * This handles email verification, password reset, magic link, and invitation links
 * 
 * Supabase sends users here after:
 * - Email confirmation
 * - Password reset link click
 * - Magic link click
 * - Invitation link click
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  // Canonical `next`, still accepting the legacy `redirectTo` spelling for
  // links already sitting in inboxes. Sanitized, because this value arrives
  // from an email link and would otherwise be an open redirect.
  const next = readNext(searchParams)
  const type = searchParams.get("type")

  if (!code) {
    console.error("[auth/callback] No code parameter in callback URL")
    return NextResponse.redirect(`${origin}/login?error=auth_callback_error&reason=missing_code`)
  }

  const supabase = await createClient()
  const { error, data } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    // Log enough to diagnose without exposing tokens.
    // The most common cause is a PKCE code_verifier mismatch: the browser
    // that opens the email link is not the same one that requested the
    // magic link, so the cookie holding the verifier is absent.
    console.error(
      "[auth/callback] exchangeCodeForSession failed:",
      error.message,
      "| status:", error.status,
      "| type:", type,
    )
    const reason = error.message.includes("code verifier")
      ? "pkce_mismatch"
      : "exchange_failed"
    return NextResponse.redirect(`${origin}/login?error=auth_callback_error&reason=${reason}`)
  }

  if (!data.user) {
    console.error("[auth/callback] Exchange succeeded but no user returned")
    return NextResponse.redirect(`${origin}/login?error=auth_callback_error&reason=no_user`)
  }

  // Handle different auth types
  if (type === "invite") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("name")
      .eq("auth_user_id", data.user.id)
      .maybeSingle()

    const profileData = profile as { name: string | null } | null
    if (!profileData || !profileData.name) {
      return NextResponse.redirect(`${origin}/accept-invite`)
    }

    return NextResponse.redirect(`${origin}/dashboard`)
  }

  if (type === "magiclink") {
    return NextResponse.redirect(new URL(next, origin))
  }

  if (type === "recovery") {
    return NextResponse.redirect(`${origin}/reset-password`)
  }

  // Default: redirect to next URL or dashboard
  return NextResponse.redirect(new URL(next, origin))
}
