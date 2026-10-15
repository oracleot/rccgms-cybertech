import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { z } from "zod"

export const runtime = "nodejs"

/**
 * GET /api/parishes/:parishId/memberships?status=pending
 *
 * List memberships for a parish. Parish admins only.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ parishId: string }> },
) {
  const { parishId } = await params
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status") ?? "pending"

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

  // Verify caller is a parish admin
  const { data: callerMembership } = await supabase
    .from("parish_memberships")
    .select("role")
    .eq("parish_id", parishId)
    .eq("profile_id", profile.id)
    .eq("status", "active")
    .single()

  if (!callerMembership || callerMembership.role !== "parish_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Also allow platform developers
  const admin = createAdminClient()
  const { data: memberships } = await admin
    .from("parish_memberships")
    .select(`
      id, parish_id, profile_id, role, status,
      requested_at, approved_at, approved_by, created_at,
      profile:profiles ( id, name, email, avatar_url )
    `)
    .eq("parish_id", parishId)
    .eq("status", status)
    .order("requested_at", { ascending: false })

  return NextResponse.json({ memberships: memberships ?? [] })
}

const updateSchema = z.object({
  action: z.enum(["approve", "decline"]),
  membershipId: z.string().uuid(),
  role: z.enum(["parish_admin", "leader", "operator", "member"]).optional(),
})

/**
 * PATCH /api/parishes/:parishId/memberships
 *
 * Approve or decline a pending membership. Parish admins only.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ parishId: string }> },
) {
  const { parishId } = await params
  const body = await request.json()
  const parsed = updateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { action, membershipId, role } = parsed.data

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

  // Verify caller is a parish admin
  const { data: callerMembership } = await supabase
    .from("parish_memberships")
    .select("role")
    .eq("parish_id", parishId)
    .eq("profile_id", profile.id)
    .eq("status", "active")
    .single()

  if (!callerMembership || callerMembership.role !== "parish_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const admin = createAdminClient()

  // Verify the membership belongs to this parish and is pending
  const { data: target } = await admin
    .from("parish_memberships")
    .select("id, status")
    .eq("id", membershipId)
    .eq("parish_id", parishId)
    .single()

  if (!target) {
    return NextResponse.json({ error: "Membership not found" }, { status: 404 })
  }

  if (target.status !== "pending") {
    return NextResponse.json(
      { error: `Cannot ${action} a membership with status: ${target.status}` },
      { status: 409 },
    )
  }

  if (action === "approve") {
    const { error } = await admin
      .from("parish_memberships")
      .update({
        status: "active",
        role: role ?? "member",
        approved_at: new Date().toISOString(),
        approved_by: profile.id,
      })
      .eq("id", membershipId)

    if (error) {
      return NextResponse.json({ error: "Failed to approve" }, { status: 500 })
    }
    return NextResponse.json({ success: true, action: "approved" })
  }

  // Decline
  const { error } = await admin
    .from("parish_memberships")
    .update({ status: "declined" })
    .eq("id", membershipId)

  if (error) {
    return NextResponse.json({ error: "Failed to decline" }, { status: 500 })
  }

  return NextResponse.json({ success: true, action: "declined" })
}
