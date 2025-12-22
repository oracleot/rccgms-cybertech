import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { inviteUserSchema } from "@/lib/validations/auth"

/**
 * POST /api/auth/invite
 * Invite a new user to the platform (Admin only)
 */
export async function POST(request: NextRequest) {
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

  // Check if user is admin
  const { data: profileData } = await supabase
    .from("profiles")
    .select("role")
    .eq("auth_user_id", user.id)
    .single()

  const profile = profileData as { role: string } | null

  if (!profile || profile.role !== "admin") {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "Admin access required" },
      { status: 403 }
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

  const parsed = inviteUserSchema.safeParse(body)

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

  const { email, name, role, departmentId } = parsed.data

  // Check if user already exists
  const adminClient = createAdminClient()
  
  const { data: existingUsers } = await adminClient.auth.admin.listUsers()
  const userExists = existingUsers?.users?.some(u => u.email === email)

  if (userExists) {
    return NextResponse.json(
      { error: "USER_EXISTS", message: "User with this email already exists" },
      { status: 409 }
    )
  }

  // Create invitation using Supabase admin
  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    email,
    {
      data: {
        name,
        role,
        department_id: departmentId,
      },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/verify?type=invite`,
    }
  )

  if (inviteError) {
    console.error("Invite error:", inviteError)
    return NextResponse.json(
      { error: "INVITE_FAILED", message: "Failed to send invitation" },
      { status: 500 }
    )
  }

  // Calculate expiration (7 days from now)
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  return NextResponse.json({
    success: true,
    invitation: {
      id: inviteData.user?.id,
      email,
      expiresAt: expiresAt.toISOString(),
    },
  })
}
