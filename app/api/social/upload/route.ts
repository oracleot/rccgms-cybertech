import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import { randomUUID } from "crypto"

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>

interface ProfileData {
  id: string
}

/**
 * POST /api/social/upload
 * Upload image for social media post
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
  const { data: profileData } = await (supabase as AnySupabaseClient)
    .from("profiles")
    .select("id")
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
  const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg"
  const validExt = ["jpg", "jpeg", "png", "webp"].includes(fileExt) ? fileExt : "jpg"
  const fileName = `${profile.id}/${randomUUID()}.${validExt}`

  // Upload to social-media bucket
  const { error: uploadError } = await supabase.storage
    .from("social-media")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    })

  if (uploadError) {
    console.error("Social media upload error:", uploadError)
    return NextResponse.json(
      { error: "UPLOAD_FAILED", message: "Failed to upload image" },
      { status: 500 }
    )
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("social-media")
    .getPublicUrl(fileName)

  return NextResponse.json({
    success: true,
    url: urlData.publicUrl,
    filename: file.name,
    size: file.size,
  })
}
