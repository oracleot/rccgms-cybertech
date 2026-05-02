/**
 * POST /api/training/requests — member submits a course request
 * GET  /api/training/requests — list requests (admin/leader see all; members see own)
 */

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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
  const { title, description, reason } = body

  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("course_requests")
    .insert({
      requested_by: profile.id,
      title: title.trim(),
      description: description?.trim() ?? null,
      reason: reason?.trim() ?? null,
    })
    .select("id")
    .single()

  if (error) {
    console.error("course_requests insert error:", error)
    return NextResponse.json({ error: "Failed to submit request" }, { status: 500 })
  }

  return NextResponse.json({ id: data.id }, { status: 201 })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data, error } = await supabase
    .from("course_requests")
    .select(`
      id, title, description, reason, status, created_at,
      requester:profiles!course_requests_requested_by_fkey(name, role)
    `)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 })
  }

  return NextResponse.json(data)
}
