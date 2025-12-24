/**
 * GET /api/social/drive/folders
 * List folders from connected Google Drive
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  getDriveClient,
  listFolders,
  refreshAccessToken,
} from "@/lib/integrations/google-drive"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get profile
    const profileQuery = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .single()

    const profile = profileQuery.data as { id: string } | null

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    const adminClient = createAdminClient()

    // Get Google Drive integration
    const integrationQuery = await adminClient
      .from("social_integrations")
      .select("*")
      .eq("user_id", profile.id)
      .eq("platform", "google_drive")
      .single()

    const integration = integrationQuery.data as {
      id: string
      access_token: string | null
      refresh_token: string | null
      token_expires_at: string | null
    } | null

    if (!integration) {
      return NextResponse.json(
        { error: "Google Drive not connected" },
        { status: 400 }
      )
    }

    // Check if token needs refresh
    let accessToken = integration.access_token
    const tokenExpiry = new Date(integration.token_expires_at || 0)
    const now = new Date()

    if (tokenExpiry <= now && integration.refresh_token) {
      try {
        const refreshed = await refreshAccessToken(integration.refresh_token)
        accessToken = refreshed.accessToken

        // Update token in database
        await adminClient
          .from("social_integrations")
          .update({
            access_token: refreshed.accessToken,
            token_expires_at: refreshed.expiresAt.toISOString(),
            updated_at: new Date().toISOString(),
          } as Record<string, unknown>)
          .eq("id", integration.id)
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError)
        return NextResponse.json(
          { error: "Google Drive session expired. Please reconnect." },
          { status: 401 }
        )
      }
    }

    // Get parent folder from query params
    const searchParams = request.nextUrl.searchParams
    const parentId = searchParams.get("parentId") || undefined

    // Get Drive client and list folders
    if (!accessToken) {
      return NextResponse.json(
        { error: "No access token available. Please reconnect Google Drive." },
        { status: 401 }
      )
    }
    const drive = await getDriveClient(accessToken, integration.refresh_token || "")
    const folders = await listFolders(drive, parentId)

    return NextResponse.json({ folders })
  } catch (error) {
    console.error("Drive folders error:", error)
    return NextResponse.json(
      { error: "Failed to list folders" },
      { status: 500 }
    )
  }
}
