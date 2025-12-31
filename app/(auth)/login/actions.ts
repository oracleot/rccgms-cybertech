"use server"

import { createClient } from "@/lib/supabase/server"
import { magicLinkSchema, type MagicLinkInput } from "@/lib/validations/auth"
import { headers } from "next/headers"

/**
 * Send a magic link to the user's email for passwordless authentication
 */
export async function sendMagicLink(data: MagicLinkInput) {
  const parsed = magicLinkSchema.safeParse(data)

  if (!parsed.success) {
    return { error: "Please enter a valid email address" }
  }

  const supabase = await createClient()
  const headersList = await headers()
  const origin = headersList.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?type=magiclink&next=${encodeURIComponent(parsed.data.redirectTo || "/dashboard")}`,
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
