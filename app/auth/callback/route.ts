import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

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
  const next = searchParams.get("next") ?? "/dashboard"
  const type = searchParams.get("type")

  if (code) {
    const supabase = await createClient()
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.user) {
      // Handle different auth types
      if (type === "invite") {
        // For invitations, check if profile is complete (has name)
        const { data: profile } = await supabase
          .from("profiles")
          .select("name")
          .eq("auth_user_id", data.user.id)
          .maybeSingle()
        
        // If profile doesn't exist or has no name, redirect to accept-invite to complete profile
        const profileData = profile as { name: string | null } | null
        if (!profileData || !profileData.name) {
          return NextResponse.redirect(`${origin}/accept-invite`)
        }
        
        // Profile is complete, go to dashboard
        return NextResponse.redirect(`${origin}/dashboard`)
      }
      
      if (type === "magiclink") {
        // For magic link logins, redirect to the requested destination
        return NextResponse.redirect(`${origin}${next}`)
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
