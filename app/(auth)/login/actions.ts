"use server"

import { createClient } from "@/lib/supabase/server"
import { loginSchema, type LoginInput } from "@/lib/validations/auth"

export async function login(data: LoginInput) {
  const parsed = loginSchema.safeParse(data)

  if (!parsed.success) {
    return { error: "Invalid email or password format" }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    // Return generic error message for security
    return { error: "Invalid email or password" }
  }

  return { success: true }
}
