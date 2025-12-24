/**
 * GET /api/social/callback/google
 * OAuth callback handler for Google Drive
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getTokensFromCode, getDriveUserInfo } from "@/lib/integrations/google-drive"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

  // Handle OAuth errors
  if (error) {
    console.error("Google OAuth error:", error)
    return NextResponse.redirect(
      `${baseUrl}/social?error=oauth_denied`
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${baseUrl}/social?error=missing_params`
    )
  }

  // Verify state token
  const cookieStore = await cookies()
  const savedState = cookieStore.get("google_oauth_state")?.value

  if (!savedState || savedState !== state) {
    console.error("OAuth state mismatch")
    return NextResponse.redirect(
      `${baseUrl}/social?error=invalid_state`
    )
  }

  // Clear the state cookie
  cookieStore.delete("google_oauth_state")

  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(
        `${baseUrl}/login?redirect=/social`
      )
    }

    // Get profile ID
    const profileQuery = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .single()

    const profile = profileQuery.data as { id: string } | null

    if (!profile) {
      return NextResponse.redirect(
        `${baseUrl}/social?error=profile_not_found`
      )
    }

    const profileId = profile.id

    // Use admin client for database writes
    const adminClient = createAdminClient()

    // Exchange code for tokens
    const tokens = await getTokensFromCode(code)

    if (!tokens.access_token || !tokens.refresh_token) {
      console.error("Missing tokens from Google OAuth")
      return NextResponse.redirect(
        `${baseUrl}/social?error=token_error`
      )
    }

    // Get user info from Drive
    const userInfo = await getDriveUserInfo(tokens.access_token, tokens.refresh_token)

    // Calculate expiry time
    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date).toISOString()
      : new Date(Date.now() + 3600 * 1000).toISOString()

    // Check if integration already exists
    const existingQuery = await adminClient
      .from("social_integrations")
      .select("id")
      .eq("user_id", profileId)
      .eq("platform", "google_drive")
      .single()
    
    const existing = existingQuery.data as { id: string } | null

    if (existing) {
      // Update existing integration
      const { error: updateError } = await adminClient
        .from("social_integrations")
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: expiresAt,
          account_name: userInfo?.displayName || userInfo?.email || null,
          updated_at: new Date().toISOString(),
        } as Record<string, unknown>)
        .eq("id", existing.id)
      
      if (updateError) {
        console.error("Update integration error:", updateError)
      }
    } else {
      // Create new integration
      const { error: insertError } = await adminClient.from("social_integrations").insert({
        platform: "google_drive",
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt,
        account_name: userInfo?.displayName || userInfo?.email || null,
        user_id: profileId,
      } as Record<string, unknown>)
      
      if (insertError) {
        console.error("Insert integration error:", insertError)
      }
    }

    return NextResponse.redirect(
      `${baseUrl}/social?connected=true`
    )
  } catch (error) {
    console.error("Google OAuth callback error:", error)
    return NextResponse.redirect(
      `${baseUrl}/social?error=callback_failed`
    )
  }
}
