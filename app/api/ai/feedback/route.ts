/**
 * POST /api/ai/feedback — submit AI output feedback
 * GET  /api/ai/feedback — list feedback (developer/admin only)
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { validateApiRole } from "@/lib/auth/guards"
import { USER_ROLES } from "@/lib/constants"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 401 })
  }

  const body = await request.json()
  const { feedbackType, platform, contextUsed, originalOutput, correctedOutput, rating } = body

  if (!feedbackType || !originalOutput) {
    return NextResponse.json({ error: "feedbackType and originalOutput are required" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("ai_feedback")
    .insert({
      user_id: profile.id,
      feedback_type: feedbackType,
      platform: platform ?? null,
      context_used: contextUsed ?? null,
      original_output: originalOutput,
      corrected_output: correctedOutput ?? null,
      rating: rating ?? null,
    })
    .select("id")
    .single()

  if (error) {
    console.error("ai_feedback insert error:", error)
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 })
  }

  return NextResponse.json({ id: data.id }, { status: 201 })
}

export async function GET() {
  const authResult = await validateApiRole([
    USER_ROLES.ADMIN,
    USER_ROLES.LEAD_DEVELOPER,
    USER_ROLES.DEVELOPER,
  ])

  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from("ai_feedback")
    .select(`
      id,
      feedback_type,
      platform,
      context_used,
      original_output,
      corrected_output,
      rating,
      is_approved,
      approved_at,
      created_at,
      user:profiles!ai_feedback_user_id_fkey(name)
    `)
    .order("created_at", { ascending: false })
    .limit(100)

  if (error) {
    return NextResponse.json({ error: "Failed to fetch feedback" }, { status: 500 })
  }

  return NextResponse.json(data)
}
