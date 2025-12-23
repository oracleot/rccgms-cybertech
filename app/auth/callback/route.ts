import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/**
 * Auth callback route for handling Supabase redirects
 * This handles email verification, password reset, and invitation links
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
  const next = searchParams.get("next") ?? "/dashboard"
  const type = searchParams.get("type")

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Handle different auth types
      if (type === "invite" || type === "magiclink") {
        // For invitations, redirect to accept-invite to set password
        return NextResponse.redirect(`${origin}/accept-invite`)
      }
      
      if (type === "recovery") {
        // For password recovery, redirect to reset-password
        return NextResponse.redirect(`${origin}/reset-password`)
      }
      
      // Default: redirect to next URL or dashboard
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // If there's no code or an error, redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
