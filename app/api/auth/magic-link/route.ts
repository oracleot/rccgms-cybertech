import { NextResponse } from "next/server"

/**
 * POST /api/auth/magic-link
 * Passwordless login has been retired. Password recovery remains available
 * through /forgot-password for members who previously used email links.
 */
export async function POST() {
  return NextResponse.json({
    error: "MAGIC_LINK_DISABLED",
    message: "Email sign-in links have been retired. Create or reset your password to continue.",
  }, { status: 410 })
}
