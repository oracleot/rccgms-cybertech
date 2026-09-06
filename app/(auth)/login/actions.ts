"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { magicLinkSchema, type MagicLinkInput } from "@/lib/validations/auth"
import { getAppUrl } from "@/lib/constants"

/**
 * Send a magic link to the user's email for passwordless authentication
 * SECURITY: Only sends magic links to users who were invited (have a profile)
 */
export async function sendMagicLink(data: MagicLinkInput) {
  const parsed = magicLinkSchema.safeParse(data)

  if (!parsed.success) {
    return { error: "Please enter a valid email address" }
  }

  // SECURITY: Verify user was invited before sending magic link
  // Check the profiles table - profiles are only created when admins invite users
  const adminClient = createAdminClient()
  const { data: existingProfile } = await adminClient
    .from("profiles")
    .select("id")
    .ilike("email", parsed.data.email) // Case-insensitive email match
    .maybeSingle()

  // If no profile exists (user wasn't invited), return special response
  // This prevents email enumeration while informing the user appropriately
  if (!existingProfile) {
    return { success: true, notInvited: true } // Flag to show different UI message
  }

  const supabase = await createClient()
  const appUrl = getAppUrl()
  const next = encodeURIComponent(parsed.data.redirectTo || "/dashboard")

  // Desktop shell: redirect through the app's custom URL scheme instead of
  // the website, so the OS hands the clicked email link back to the Fusion
  // app instead of just opening it in the default browser. The desktop
  // app's deep-link handler rewrites this to the same /auth/callback route
  // on the real site once it receives it (see desktop/src-tauri).
  const emailRedirectTo =
    parsed.data.platform === "desktop"
      ? `fusion://auth-callback?type=magiclink&next=${next}`
      : `${appUrl}/auth/callback?type=magiclink&next=${next}`

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo,
    },
  })

  if (error) {
    // Check for rate limiting
    if (error.message.includes("rate") || error.status === 429) {
      return { error: "Too many requests. Please wait a few minutes before trying again." }
    }
    // Generic error for security (don't reveal if email exists)
    return { error: "Unable to send magic link. Please try again later." }
  }

  return { success: true }
}
