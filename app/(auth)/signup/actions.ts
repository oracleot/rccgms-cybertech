"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { signupSchema, type SignupInput } from "@/lib/validations/auth"
import { getAppUrl } from "@/lib/constants"

/**
 * Create a new account with email/password, a profile, and a pending
 * parish membership in one atomic flow.
 *
 * 1. Supabase signUp (creates auth.users row, sends confirmation email)
 * 2. Admin client creates the profile row (auth_user_id → user.id)
 * 3. Admin client creates a pending parish membership
 *
 * The user cannot log in until they confirm their email.
 */
export async function signUp(data: SignupInput) {
  const parsed = signupSchema.safeParse(data)
  if (!parsed.success) {
    const errors = parsed.error.flatten()
    const firstError = Object.values(errors.fieldErrors)[0]?.[0]
    return { error: firstError || "Please check your details" }
  }

  const { firstName, lastName, email, password, parishId } = parsed.data
  const name = `${firstName} ${lastName}`.trim()

  const admin = createAdminClient()

  // Check for existing profile with this email
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle()

  if (existingProfile) {
    return { error: "An account with this email already exists. Please sign in." }
  }

  // Verify the parish exists and is active
  const { data: parish } = await admin
    .from("parishes")
    .select("id, organisation_id")
    .eq("id", parishId)
    .eq("status", "active")
    .single()

  if (!parish) {
    return { error: "The selected parish is not available. Please try again." }
  }

  // 1. Create the auth user
  const supabase = await createClient()
  const appUrl = getAppUrl()

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${appUrl}/auth/callback?type=signup`,
      data: { name },
    },
  })

  if (authError) {
    if (authError.message.includes("already registered")) {
      return { error: "An account with this email already exists. Please sign in." }
    }
    if (authError.message.includes("rate") || authError.status === 429) {
      return { error: "Too many attempts. Please wait a few minutes." }
    }
    return { error: "Unable to create account. Please try again." }
  }

  if (!authData.user) {
    return { error: "Unable to create account. Please try again." }
  }

  // 2. Retrieve the trigger-created profile (handle_new_user fires on auth.users INSERT)
  //    and update it with any additional details. Do NOT insert a second profile.
  let profile: { id: string } | null = null
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data } = await admin
      .from("profiles")
      .select("id")
      .eq("auth_user_id", authData.user.id)
      .maybeSingle()
    if (data) { profile = data; break }
    await new Promise((r) => setTimeout(r, 200))
  }

  if (!profile) {
    return { error: "Account created but profile setup failed. Please contact support." }
  }

  const { error: updateError } = await admin
    .from("profiles")
    .update({ name, role: "member" })
    .eq("id", profile.id)

  if (updateError) {
    return { error: "Account created but profile update failed. Please contact support." }
  }

  // 3. Create a pending parish membership
  const { error: membershipError } = await admin
    .from("parish_memberships")
    .insert({
      parish_id: parishId,
      profile_id: profile.id,
      role: "member",
      status: "pending",
      requested_at: new Date().toISOString(),
    })

  if (membershipError) {
    return { error: "Account created but parish membership request failed. Please contact your parish admin." }
  }

  return { success: true }
}
