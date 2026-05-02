/**
 * PATCH /api/training/requests/[id] — approve or reject a course request
 */

import { NextRequest, NextResponse } from "next/server"
import { validateApiRole } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"
import { USER_ROLES } from "@/lib/constants"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await validateApiRole([
    USER_ROLES.ADMIN,
    USER_ROLES.LEAD_DEVELOPER,
    USER_ROLES.LEADER,
  ])

  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id } = await params
  const body = await request.json()
  const { status, reviewNotes } = body

  if (!["approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "status must be 'approved' or 'rejected'" }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: reviewerProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", authResult.user.id)
    .single()

  const { error } = await supabase
    .from("course_requests")
    .update({
      status,
      reviewed_by: reviewerProfile?.id ?? null,
      reviewed_at: new Date().toISOString(),
      review_notes: reviewNotes ?? null,
    })
    .eq("id", id)

  if (error) {
    console.error("course_requests update error:", error)
    return NextResponse.json({ error: "Failed to update request" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
