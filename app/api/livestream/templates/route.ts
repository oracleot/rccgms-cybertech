/**
 * GET /api/livestream/templates
 * PUT /api/livestream/templates (update by platform)
 * 
 * Manage prompt templates for AI generation.
 */

import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

// Template row type
interface TemplateRow {
  id: string
  name: string
  platform: string
  template: string
  is_default: boolean
  updated_at: string
  created_by: string | null
}

// Validation schema for template updates
const updateTemplateSchema = z.object({
  platform: z.enum(["youtube", "facebook"]),
  systemPrompt: z.string().min(100, "Template must be at least 100 characters").max(5000),
})

export async function GET() {
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

    // Get user profile to check role - only admins can access
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("auth_user_id", user.id)
      .single()

    const profileRole = (profile as { role: string } | null)?.role
    if (!profileRole || (profileRole !== "admin" && profileRole !== "lead_developer")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Admin access required" },
        { status: 403 }
      )
    }

    // Fetch templates
    const { data: templates, error } = await supabase
      .from("prompt_templates")
      .select(`
        id,
        name,
        platform,
        template,
        is_default,
        updated_at,
        created_by
      `)
      .eq("is_default", true)
      .order("platform")

    if (error) {
      console.error("Error fetching templates:", error)
      return NextResponse.json(
        { error: "DATABASE_ERROR", message: "Failed to fetch templates" },
        { status: 500 }
      )
    }

    // Format response
    const templateRows = templates as TemplateRow[] | null
    const youtubeTemplate = templateRows?.find((t) => t.platform === "youtube")
    const facebookTemplate = templateRows?.find((t) => t.platform === "facebook")

    return NextResponse.json({
      templates: {
        youtube: youtubeTemplate
          ? {
              id: youtubeTemplate.id,
              systemPrompt: youtubeTemplate.template,
              updatedAt: youtubeTemplate.updated_at,
            }
          : null,
        facebook: facebookTemplate
          ? {
              id: facebookTemplate.id,
              systemPrompt: facebookTemplate.template,
              updatedAt: facebookTemplate.updated_at,
            }
          : null,
      },
    })
  } catch (error) {
    console.error("Error in templates GET:", error)
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
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

    // Get user profile to check role - only admins can access
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("auth_user_id", user.id)
      .single()

    const profileData = profile as { id: string; role: string } | null
    if (!profileData || (profileData.role !== "admin" && profileData.role !== "lead_developer")) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Admin access required" },
        { status: 403 }
      )
    }

    // Parse and validate body
    const body = await request.json()
    const parsed = updateTemplateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { platform, systemPrompt } = parsed.data

    // Check if template exists
    const { data: existingData } = await supabase
      .from("prompt_templates")
      .select("id")
      .eq("platform", platform)
      .eq("is_default", true)
      .single()

    const existingTemplate = existingData as { id: string } | null

    if (existingTemplate) {
      // Update existing template
       
      const { data: template, error } = await (supabase
        .from("prompt_templates") as ReturnType<typeof supabase.from>)
        .update({
          template: systemPrompt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingTemplate.id)
        .select()
        .single()

      if (error) {
        console.error("Error updating template:", error)
        return NextResponse.json(
          { error: "DATABASE_ERROR", message: "Failed to update template" },
          { status: 500 }
        )
      }

      const templateData = template as TemplateRow

      return NextResponse.json({
        success: true,
        template: {
          id: templateData.id,
          systemPrompt: templateData.template,
          updatedAt: templateData.updated_at,
        },
      })
    } else {
      // Create new template
       
      const { data: template, error } = await (supabase
        .from("prompt_templates") as ReturnType<typeof supabase.from>)
        .insert({
          name: `Default ${platform.charAt(0).toUpperCase() + platform.slice(1)} Template`,
          platform,
          template: systemPrompt,
          is_default: true,
          created_by: profileData.id,
        })
        .select()
        .single()

      if (error) {
        console.error("Error creating template:", error)
        return NextResponse.json(
          { error: "DATABASE_ERROR", message: "Failed to create template" },
          { status: 500 }
        )
      }

      const templateData = template as TemplateRow

      return NextResponse.json({
        success: true,
        template: {
          id: templateData.id,
          systemPrompt: templateData.template,
          updatedAt: templateData.updated_at,
        },
      })
    }
  } catch (error) {
    console.error("Error in templates PUT:", error)
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
