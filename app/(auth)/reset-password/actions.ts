"use server"

import { createClient } from "@/lib/supabase/server"
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validations/auth"

export async function updatePassword(data: ResetPasswordInput) {
  const parsed = resetPasswordSchema.safeParse(data)

  if (!parsed.success) {
    const errors = parsed.error.flatten()
    const firstError = Object.values(errors.fieldErrors)[0]?.[0]
    return { error: firstError || "Invalid password format" }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  })

  if (error) {
    return { error: "Failed to update password. Please try again." }
  }

  return { success: true }
}
