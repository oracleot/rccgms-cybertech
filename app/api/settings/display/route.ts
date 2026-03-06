import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { updateDisplaySettingsSchema } from "@/lib/validations/settings"
import { DEFAULT_DISPLAY_SETTINGS } from "@/types/settings"
import { PostgrestError } from "@supabase/supabase-js"

// Type for display_settings table (not yet in generated types)
// TODO: Remove after running npx supabase db:generate
interface DisplaySettingsRow {
  id: string
  profile_id: string
  font_size: number
  font_family: string
  background_color: string
  text_color: string
  logo_url: string | null
  transition_effect: string
  created_at: string
  updated_at: string
}

interface DisplaySettingsResult {
  data: DisplaySettingsRow | null
  error: PostgrestError | null
}

/**
 * GET /api/settings/display
 * Returns the user's display settings or defaults if none exist
 */
export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get the user's profile ID
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      )
    }

    const profileData = profile as { id: string }

    // Fetch display settings
    // Note: display_settings table not in generated types until migration is applied
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- display_settings not in generated types
    const supabaseAny = supabase as any
    const result: DisplaySettingsResult = await supabaseAny
      .from("display_settings")
      .select("*")
      .eq("profile_id", profileData.id)
      .single()

    const settings = result.data
    const settingsError = result.error

    // If no settings exist, return defaults
    if (settingsError?.code === "PGRST116" || !settings) {
      return NextResponse.json({
        ...DEFAULT_DISPLAY_SETTINGS,
        profileId: profileData.id,
        isDefault: true,
      })
    }

    if (settingsError) {
      console.error("Error fetching display settings:", settingsError)
      return NextResponse.json(
        { error: "Failed to fetch display settings" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      id: settings.id,
      profileId: settings.profile_id,
      fontSize: settings.font_size,
      fontFamily: settings.font_family,
      backgroundColor: settings.background_color,
      textColor: settings.text_color,
      logoUrl: settings.logo_url,
      transitionEffect: settings.transition_effect,
      createdAt: settings.created_at,
      updatedAt: settings.updated_at,
      isDefault: false,
    })
  } catch (error) {
    console.error("Error in GET /api/settings/display:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/settings/display
 * Upsert display settings for the authenticated user
 */
export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get the user's profile ID
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      )
    }

    const profileData = profile as { id: string }

    // Parse and validate request body
    const body = await request.json()
    const parsed = updateDisplaySettingsSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const {
      fontSize,
      fontFamily,
      backgroundColor,
      textColor,
      logoUrl,
      transitionEffect,
    } = parsed.data

    // Upsert display settings
    // Note: display_settings table not in generated types until migration is applied
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- display_settings not in generated types
    const supabaseAny = supabase as any
    const result: DisplaySettingsResult = await supabaseAny
      .from("display_settings")
      .upsert(
        {
          profile_id: profileData.id,
          font_size: fontSize,
          font_family: fontFamily,
          background_color: backgroundColor,
          text_color: textColor,
          logo_url: logoUrl ?? null,
          transition_effect: transitionEffect,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "profile_id",
        }
      )
      .select()
      .single()

    const settings = result.data
    const upsertError = result.error

    if (upsertError || !settings) {
      console.error("Error upserting display settings:", upsertError)
      return NextResponse.json(
        { error: "Failed to save display settings" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      id: settings.id,
      profileId: settings.profile_id,
      fontSize: settings.font_size,
      fontFamily: settings.font_family,
      backgroundColor: settings.background_color,
      textColor: settings.text_color,
      logoUrl: settings.logo_url,
      transitionEffect: settings.transition_effect,
      createdAt: settings.created_at,
      updatedAt: settings.updated_at,
    })
  } catch (error) {
    console.error("Error in PUT /api/settings/display:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
