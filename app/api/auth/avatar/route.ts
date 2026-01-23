import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { SupabaseClient } from "@supabase/supabase-js"

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

// Helper to work around Supabase type inference issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase client type workaround
type AnySupabaseClient = SupabaseClient<any, any, any>

interface ProfileData {
  id: string
  avatar_url: string | null
}

/**
 * POST /api/auth/avatar
 * Upload profile avatar
 */
export async function POST(request: NextRequest) {
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

  // Get current profile
  const { data: profileData } = await supabase
    .from("profiles")
    .select("id, avatar_url")
    .eq("auth_user_id", user.id)
    .single()

  const profile = profileData as ProfileData | null

  if (!profile) {
    return NextResponse.json(
      { error: "NOT_FOUND", message: "Profile not found" },
      { status: 404 }
    )
  }

  let formData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json(
      { error: "INVALID_REQUEST", message: "Expected multipart/form-data" },
      { status: 400 }
    )
  }

  const file = formData.get("file") as File | null

  if (!file) {
    return NextResponse.json(
      { error: "INVALID_FILE", message: "No file provided" },
      { status: 400 }
    )
  }

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "INVALID_FILE", message: "File must be JPEG, PNG, or WebP" },
      { status: 400 }
    )
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "INVALID_FILE", message: "File must be less than 5MB" },
      { status: 400 }
    )
  }

  // Generate unique filename
  const fileExt = file.name.split(".").pop() || "jpg"
  const fileName = `${profile.id}/${Date.now()}.${fileExt}`

  // Delete old avatar if exists
  if (profile.avatar_url) {
    const oldPath = profile.avatar_url.split("/").pop()
    if (oldPath) {
      await supabase.storage.from("avatars").remove([`${profile.id}/${oldPath}`])
    }
  }

  // Upload new avatar
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: true,
    })

  if (uploadError) {
    console.error("Avatar upload error:", uploadError)
    return NextResponse.json(
      { error: "UPLOAD_FAILED", message: "Failed to upload avatar" },
      { status: 500 }
    )
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("avatars")
    .getPublicUrl(fileName)

  const avatarUrl = urlData.publicUrl

  // Update profile with new avatar URL
  const untypedClient = supabase as AnySupabaseClient
  const { error: updateError } = await untypedClient
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", profile.id)

  if (updateError) {
    console.error("Profile update error:", updateError)
    return NextResponse.json(
      { error: "UPDATE_FAILED", message: "Failed to update profile" },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    avatarUrl,
  })
}
