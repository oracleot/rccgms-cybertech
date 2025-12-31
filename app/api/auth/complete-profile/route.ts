import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { completeProfileSchema } from "@/lib/validations/auth"
import type { SupabaseClient } from "@supabase/supabase-js"

// Helper to work around Supabase type inference issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>

interface ProfileData {
  id: string
  name: string
  role: string
}

/**
 * PUT /api/auth/complete-profile
 * Complete a user's profile after first-time magic link login
 * Primarily used for setting the user's name if not provided during invitation
 */
export async function PUT(request: NextRequest) {
  const supabase = await createClient()

  // Verify current user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Not authenticated" },
      { status: 401 }
    )
  }

  // Parse and validate request body
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "Invalid JSON body" },
      { status: 400 }
    )
  }

  const parsed = completeProfileSchema.safeParse(body)

  if (!parsed.success) {
    const errors = parsed.error.flatten()
    const details = Object.entries(errors.fieldErrors).map(([field, messages]) => ({
      field,
      message: messages?.[0] || "Invalid value",
    }))
    return NextResponse.json(
      { error: "VALIDATION_ERROR", details },
      { status: 400 }
    )
  }

  const { name } = parsed.data

  // Get current profile
  const { data: existingProfileData, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single()

  const existingProfile = existingProfileData as { id: string; role: string } | null

  if (profileError || !existingProfile) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Profile not found" },
      { status: 404 }
    )
  }

  // Update profile with name
  const untypedClient = supabase as AnySupabaseClient
  const { error: updateError } = await untypedClient
    .from("profiles")
    .update({ name })
    .eq("id", existingProfile.id)

  if (updateError) {
    console.error("Profile completion error:", updateError)
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Failed to update profile. Please try again." },
      { status: 500 }
    )
  }

  // Fetch updated profile
  const { data: updatedData } = await supabase
    .from("profiles")
    .select("id, name, role")
    .eq("id", existingProfile.id)
    .single()

  const updatedProfile = updatedData as ProfileData | null

  return NextResponse.json({
    success: true,
    profile: {
      id: updatedProfile?.id,
      name: updatedProfile?.name,
      email: user.email,
      role: updatedProfile?.role,
    },
  })
}
