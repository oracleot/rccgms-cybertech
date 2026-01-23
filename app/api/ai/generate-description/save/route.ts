/**
 * POST /api/ai/generate-description/save
 * 
 * Save a generated description to history.
 */

import { createClient } from "@/lib/supabase/server"
import { saveDescriptionSchema } from "@/lib/validations/livestream"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Authentication required" },
        { status: 401 }
      )
    }

    // Get user profile to check role
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("auth_user_id", user.id)
      .single()

    const profileData = profile as { id: string; role: string } | null
    if (!profileData || !["admin", "leader"].includes(profileData.role)) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Leader or Admin access required" },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const parsed = saveDescriptionSchema.safeParse(body)
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { rotaId, title, platform, content, speaker, scripture, metadata } = parsed.data

    // Check if a livestream already exists for this rota
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic structure from DB query
    let existingLivestream: any = null
    if (rotaId) {
      const { data } = await supabase
        .from("livestreams")
        .select("id, youtube_description, facebook_description")
        .eq("rota_id", rotaId)
        .single()
      existingLivestream = data
    }

    // Prepare the update data
    const descriptionField = platform === "youtube" ? "youtube_description" : "facebook_description"

    if (existingLivestream) {
      // Update existing livestream
       
      const { data: livestream, error } = await (supabase
        .from("livestreams") as ReturnType<typeof supabase.from>)
        .update({
          [descriptionField]: content,
          title,
          speaker: speaker || null,
          scripture: scripture || null,
          metadata: metadata || {},
        })
        .eq("id", existingLivestream.id)
        .select()
        .single()

      if (error) {
        console.error("Error updating livestream:", error)
        return NextResponse.json(
          { error: "DATABASE_ERROR", message: "Failed to update description" },
          { status: 500 }
        )
      }

      const livestreamData = livestream as {
        id: string
        title: string
        youtube_description: string | null
        facebook_description: string | null
        created_at: string
      }

      return NextResponse.json({
        success: true,
        livestream: {
          id: livestreamData.id,
          title: livestreamData.title,
          youtubeDescription: livestreamData.youtube_description,
          facebookDescription: livestreamData.facebook_description,
          createdAt: livestreamData.created_at,
        },
      })
    } else {
      // Create new livestream
      const insertData = {
        title,
        created_by: profileData.id,
        speaker: speaker || null,
        scripture: scripture || null,
        metadata: metadata || {},
        youtube_description: platform === "youtube" ? content : null,
        facebook_description: platform === "facebook" ? content : null,
        rota_id: rotaId || null,
      }

       
      const { data: livestream, error } = await (supabase
        .from("livestreams") as ReturnType<typeof supabase.from>)
        .insert(insertData)
        .select()
        .single()

      if (error) {
        console.error("Error creating livestream:", error)
        return NextResponse.json(
          { error: "DATABASE_ERROR", message: "Failed to save description" },
          { status: 500 }
        )
      }

      const livestreamData = livestream as {
        id: string
        title: string
        youtube_description: string | null
        facebook_description: string | null
        created_at: string
      }

      return NextResponse.json({
        success: true,
        livestream: {
          id: livestreamData.id,
          title: livestreamData.title,
          youtubeDescription: livestreamData.youtube_description,
          facebookDescription: livestreamData.facebook_description,
          createdAt: livestreamData.created_at,
        },
      })
    }
  } catch (error) {
    console.error("Error in save description:", error)
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
