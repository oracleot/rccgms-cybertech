import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { ROUTES } from "@/lib/constants"

/**
 * Email verification callback handler
 * Handles the redirect from Supabase after email verification
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const type = requestUrl.searchParams.get("type")
  const next = requestUrl.searchParams.get("next") || ROUTES.DASHBOARD

  if (code) {
    const supabase = await createClient()

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error("Email verification error:", error)
      // Redirect to login with error message
      return NextResponse.redirect(
        new URL(`${ROUTES.LOGIN}?error=verification_failed`, request.url)
      )
    }

    // Handle different verification types
    if (type === "recovery") {
      // Password recovery - redirect to reset password page
      return NextResponse.redirect(
        new URL(ROUTES.RESET_PASSWORD, request.url)
      )
    }

    if (type === "invite") {
      // Invitation acceptance - redirect to set password
      return NextResponse.redirect(
        new URL(`${ROUTES.RESET_PASSWORD}?type=invite`, request.url)
      )
    }

    // Default: email verification - redirect to intended destination
    return NextResponse.redirect(new URL(next, request.url))
  }

  // No code provided - redirect to login
  return NextResponse.redirect(new URL(ROUTES.LOGIN, request.url))
}
