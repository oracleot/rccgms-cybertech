"use server"

import { createClient } from "@/lib/supabase/server"
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validations/auth"
import { getAppUrl } from "@/lib/constants"

export async function requestPasswordReset(data: ForgotPasswordInput) {
  const parsed = forgotPasswordSchema.safeParse(data)

  if (!parsed.success) {
    return { error: "Please enter a valid email address" }
  }

  const supabase = await createClient()
  const appUrl = getAppUrl()

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appUrl}/reset-password`,
  })

  if (error) {
    // Don't reveal if email exists for security
    console.error("Password reset error:", error)
  }

  // Always return success to prevent email enumeration
  return { success: true }
}
