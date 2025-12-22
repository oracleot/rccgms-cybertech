"use server"

import { createClient } from "@/lib/supabase/server"
import { registerSchema, type RegisterInput } from "@/lib/validations/auth"

export async function register(data: RegisterInput) {
  const parsed = registerSchema.safeParse(data)

  if (!parsed.success) {
    const errors = parsed.error.flatten()
    const firstError = Object.values(errors.fieldErrors)[0]?.[0]
    return { error: firstError || "Invalid input" }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        name: parsed.data.name,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/verify`,
    },
  })

  if (error) {
    if (error.message.includes("already registered")) {
      return { error: "An account with this email already exists" }
    }
    return { error: error.message }
  }

  return { success: true }
}
