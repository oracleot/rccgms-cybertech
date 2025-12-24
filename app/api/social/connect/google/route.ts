/**
 * POST /api/social/connect/google
 * Initiate Google OAuth flow for Drive access
 */

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getAuthUrl } from "@/lib/integrations/google-drive"
import { cookies } from "next/headers"

export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check user role - only leaders and admins can connect
    const profileQuery = await supabase
      .from("profiles")
      .select("role")
      .eq("auth_user_id", user.id)
      .single()

    const profile = profileQuery.data as { role: string } | null

    if (!profile || profile.role === "volunteer") {
      return NextResponse.json(
        { error: "Only leaders and admins can connect Google Drive" },
        { status: 403 }
      )
    }

    // Generate a state token for CSRF protection
    const state = crypto.randomUUID()

    // Store state in a cookie for verification in callback
    const cookieStore = await cookies()
    cookieStore.set("google_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10, // 10 minutes
      path: "/",
    })

    // Generate the OAuth URL
    const authUrl = getAuthUrl(state)

    return NextResponse.json({ authUrl })
  } catch (error) {
    console.error("Google OAuth initiation error:", error)
    return NextResponse.json(
      { error: "Failed to initiate OAuth" },
      { status: 500 }
    )
  }
}
