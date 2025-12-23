// @ts-nocheck
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

interface RouteContext {
  params: Promise<{ progressId: string }>
}

export async function GET(request: Request, context: RouteContext) {
  const { progressId } = await context.params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get user's profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, role")
    .eq("auth_user_id", user.id)
    .single()

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 })
  }

  // Get the progress record
  const { data: progress } = await supabase
    .from("volunteer_progress")
    .select(`
      *,
      track:onboarding_tracks(
        id,
        name,
        department:departments(id, name)
      )
    `)
    .eq("id", progressId)
    .single()

  if (!progress) {
    return NextResponse.json({ error: "Progress not found" }, { status: 404 })
  }

  // Verify user owns this progress or is admin
  if (progress.user_id !== profile.id && profile.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  // Check if track is completed
  if (progress.status !== "completed") {
    return NextResponse.json(
      { error: "Track not completed yet" }, 
      { status: 400 }
    )
  }

  // Get the user who completed the track
  const { data: completedByProfile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", progress.user_id)
    .single()

  // Generate certificate data
  const certificateData = {
    userName: completedByProfile?.name || "Unknown",
    trackName: progress.track?.name || "Unknown Track",
    departmentName: progress.track?.department?.name || "General",
    completedAt: progress.completed_at || new Date().toISOString(),
    certificateId: progress.id,
  }

  // Return certificate data as JSON (can be used to render a certificate page)
  return NextResponse.json(certificateData)
}
