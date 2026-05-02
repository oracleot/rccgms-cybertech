/**
 * PATCH /api/ai/feedback/[id] — approve or reject a feedback entry
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
    USER_ROLES.DEVELOPER,
  ])

  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { id } = await params
  const body = await request.json()
  const { isApproved, correctedOutput } = body

  if (typeof isApproved !== "boolean") {
    return NextResponse.json({ error: "isApproved (boolean) is required" }, { status: 400 })
  }

  const supabase = await createClient()

  const { data: approverProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", authResult.user.id)
    .single()

  const updatePayload: Record<string, unknown> = {
    is_approved: isApproved,
    approved_by: approverProfile?.id ?? null,
    approved_at: new Date().toISOString(),
  }

  if (correctedOutput !== undefined) {
    updatePayload.corrected_output = correctedOutput
  }

  const { error } = await supabase
    .from("ai_feedback")
    .update(updatePayload)
    .eq("id", id)

  if (error) {
    console.error("ai_feedback update error:", error)
    return NextResponse.json({ error: "Failed to update feedback" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
