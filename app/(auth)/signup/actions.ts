"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { signupSchema, type SignupInput } from "@/lib/validations/auth"
import { getAppUrl } from "@/lib/constants"
import { emitEvent } from "@/lib/telemetry"

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
  const correlationId = crypto.randomUUID()
  const safeEmail = typeof data?.email === "string" ? data.email.trim().toLowerCase() : ""
  const emailDomain = safeEmail.includes("@") ? safeEmail.split("@")[1] : undefined
  const log = (status: string, stage: string, metadata: Record<string, unknown> = {}) => {
    void emitEvent({ subsystem: "auth", action: "signup", status, severity: status === "error" ? "error" : "info", correlation_id: correlationId, metadata: { stage, email_domain: emailDomain, ...metadata } })
  }
  log("started", "validation")
  const parsed = signupSchema.safeParse(data)
  if (!parsed.success) {
    const errors = parsed.error.flatten()
    const firstError = Object.values(errors.fieldErrors)[0]?.[0]
    log("error", "validation", { reason: "invalid_input", field: Object.keys(errors.fieldErrors)[0] })
    return { error: firstError || "Please check your details", reference: correlationId }
  }

  const { firstName, lastName, email, password, parishId } = parsed.data
  const name = `${firstName} ${lastName}`.trim()

  const admin = createAdminClient()

  // Check for existing profile with this email
  const { data: existingProfile, error: existingProfileError } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle()

  if (existingProfileError) {
    log("error", "profile_lookup", { reason: existingProfileError.message })
    return { error: "We could not check your account yet. Please try again.", reference: correlationId }
  }

  if (existingProfile) {
    log("error", "existing_profile", { reason: "profile_exists" })
    return { error: "An account with this email already exists. Please sign in.", reference: correlationId }
  }

  // Verify the parish exists and is active
  const { data: parish, error: parishError } = await admin
    .from("parishes")
    .select("id, organisation_id")
    .eq("id", parishId)
    .eq("status", "active")
    .single()

  if (parishError) {
    log("error", "parish_lookup", { reason: parishError.message, parish_id: parishId })
    return { error: "We could not verify that parish yet. Please try again.", reference: correlationId }
  }

  if (!parish) {
    log("error", "parish_lookup", { reason: "not_found_or_inactive" })
    return { error: "The selected parish is not available. Please try again.", reference: correlationId }
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
      log("error", "supabase_signup", { reason: "already_registered" })
      return { error: "An account with this email already exists. Please sign in.", reference: correlationId }
    }
    if (authError.message.includes("rate") || authError.status === 429) {
      log("error", "supabase_signup", { reason: "rate_limited", status: authError.status })
      return { error: "Too many attempts. Please wait a few minutes.", reference: correlationId }
    }
    log("error", "supabase_signup", { reason: authError.message, status: authError.status })
    return { error: "Unable to create account. Please try again.", reference: correlationId }
  }

  if (!authData.user) {
    log("error", "supabase_signup", { reason: "no_user_returned" })
    return { error: "Unable to create account. Please try again.", reference: correlationId }
  }

  // 2. Retrieve the trigger-created profile (handle_new_user fires on auth.users INSERT)
  //    and update it with any additional details. Do NOT insert a second profile.
  let profile: { id: string } | null = null
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error: profileLookupError } = await admin
      .from("profiles")
      .select("id")
      .eq("auth_user_id", authData.user.id)
      .maybeSingle()
    if (profileLookupError) {
      log("error", "profile_trigger", { reason: profileLookupError.message })
      return { error: "Account created but profile setup could not be checked. Please contact support.", reference: correlationId }
    }
    if (data) { profile = data; break }
    await new Promise((r) => setTimeout(r, 200))
  }

  if (!profile) {
    log("error", "profile_trigger", { reason: "profile_not_created", auth_user_id: authData.user.id })
    return { error: "Account created but profile setup failed. Please contact support.", reference: correlationId }
  }

  const { error: updateError } = await admin
    .from("profiles")
    .update({ name, role: "member" })
    .eq("id", profile.id)

  if (updateError) {
    log("error", "profile_update", { reason: updateError.message })
    return { error: "Account created but profile update failed. Please contact support.", reference: correlationId }
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
    log("error", "membership_insert", { reason: membershipError.message, parish_id: parishId })
    return { error: "Account created but parish membership request failed. Please contact your parish admin.", reference: correlationId }
  }

  log("ok", "completed", { parish_id: parishId, auth_user_id: authData.user.id })
  return { success: true, reference: correlationId }
}
