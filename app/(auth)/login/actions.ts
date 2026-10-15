"use server"

import { createClient } from "@/lib/supabase/server"
import { loginSchema, type LoginInput } from "@/lib/validations/auth"

/**
 * Sign in with email and password.
 */
export async function signInWithPassword(data: LoginInput) {
  const parsed = loginSchema.safeParse(data)

  if (!parsed.success) {
    const errors = parsed.error.flatten()
    const firstError = Object.values(errors.fieldErrors)[0]?.[0]
    return { error: firstError || "Invalid email or password" }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    if (error.message.includes("Invalid login credentials")) {
      return { error: "Invalid email or password" }
    }
    if (error.message.includes("Email not confirmed")) {
      return { error: "Please check your email and confirm your account first" }
    }
    if (error.message.includes("rate") || error.status === 429) {
      return { error: "Too many attempts. Please wait a few minutes." }
    }
    return { error: "Unable to sign in. Please try again." }
  }

  return { success: true }
}
