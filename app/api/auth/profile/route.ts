import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { TablesUpdate } from "@/types/database"
import type { SupabaseClient } from "@supabase/supabase-js"

interface ProfileWithDepartment {
  id: string
  auth_user_id: string
  name: string
  phone: string | null
  avatar_url: string | null
  role: string
  department_id: string | null
  departments: { id: string; name: string } | null
}

// Helper to work around Supabase type inference issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase client type workaround
type AnySupabaseClient = SupabaseClient<any, any, any>

/**
 * GET /api/auth/profile
 * Get current user's profile
 */
export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Not authenticated" },
      { status: 401 }
    )
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(`
      id,
      auth_user_id,
      name,
      phone,
      avatar_url,
      role,
      department_id,
      departments!fk_profiles_department (
        id,
        name
      )
    `)
    .eq("auth_user_id", user.id)
    .single()

  const profile = data as unknown as ProfileWithDepartment | null

  if (error || !profile) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Profile not found" },
      { status: 404 }
    )
  }

  // Fetch notification preferences
  const { data: preferences } = await supabase
    .from("notification_preferences")
    .select("notification_type, email_enabled, sms_enabled, reminder_timing")
    .eq("user_id", profile.id)

  return NextResponse.json({
    id: profile.id,
    email: user.email,
    name: profile.name,
    phone: profile.phone,
    avatarUrl: profile.avatar_url,
    role: profile.role,
    department: profile.departments
      ? {
          id: profile.departments.id,
          name: profile.departments.name,
        }
      : null,
    notificationPreferences: preferences || [],
  })
}

/**
 * PATCH /api/auth/profile
 * Update current user's profile
 */
export async function PATCH(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Not authenticated" },
      { status: 401 }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "Invalid JSON body" },
      { status: 400 }
    )
  }

  // Get current profile
  const { data: existingProfileData } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .single()

  const existingProfile = existingProfileData as { id: string } | null

  if (!existingProfile) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Profile not found" },
      { status: 404 }
    )
  }

  // Build update object
  const updateData: TablesUpdate<"profiles"> = {}
  
  if (body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.length < 2) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", details: [{ field: "name", message: "Name must be at least 2 characters" }] },
        { status: 400 }
      )
    }
    updateData.name = body.name
  }

  if (body.phone !== undefined) {
    updateData.phone = body.phone
  }

  if (body.avatarUrl !== undefined) {
    updateData.avatar_url = body.avatarUrl
  }

  if (body.departmentId !== undefined) {
    updateData.department_id = body.departmentId
  }

  // Update profile if there are changes
  if (Object.keys(updateData).length > 0) {
    const untypedClient = supabase as AnySupabaseClient
    const { error: updateError } = await untypedClient
      .from("profiles")
      .update(updateData)
      .eq("id", existingProfile.id)

    if (updateError) {
      console.error("Profile update error:", updateError)
      return NextResponse.json(
        { error: "UPDATE_FAILED", message: "Failed to update profile" },
        { status: 500 }
      )
    }
  }

  // Handle notification preferences update
  if (body.notificationPreferences) {
    const untypedClient = supabase as AnySupabaseClient
    for (const pref of body.notificationPreferences) {
      const prefData = {
        user_id: existingProfile.id,
        notification_type: pref.notificationType as string,
        email_enabled: pref.emailEnabled as boolean,
        sms_enabled: pref.smsEnabled as boolean,
        reminder_timing: (pref.reminderTiming as string) || "1_day",
      }
      const { error: prefError } = await untypedClient
        .from("notification_preferences")
        .upsert(prefData)

      if (prefError) {
        console.error("Notification preference update error:", prefError)
      }
    }
  }

  // Fetch updated profile
  const { data: updatedData } = await supabase
    .from("profiles")
    .select(`
      id,
      name,
      phone,
      avatar_url,
      role,
      department_id,
      departments!fk_profiles_department (
        id,
        name
      )
    `)
    .eq("id", existingProfile.id)
    .single()

  const updatedProfile = updatedData as unknown as ProfileWithDepartment | null

  return NextResponse.json({
    success: true,
    profile: {
      id: updatedProfile?.id,
      email: user.email,
      name: updatedProfile?.name,
      phone: updatedProfile?.phone,
      avatarUrl: updatedProfile?.avatar_url,
      role: updatedProfile?.role,
      department: updatedProfile?.departments || null,
    },
  })
}
