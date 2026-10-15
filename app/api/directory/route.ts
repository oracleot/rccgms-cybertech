/**
 * GET /api/directory
 *
 * Parish member directory for ordinary members (pickers, team lists, etc).
 *
 * PRIVACY: this endpoint deliberately returns display fields only.
 * `email`, `phone`, `notification_preferences`, `auth_user_id` and the
 * platform-level `role` are NEVER selected here. Email and phone are
 * restricted to: the profile owner themselves, parish admins (via the
 * admin-gated parish/membership routes), and platform developers.
 * Ordinary parish peers must not read them just because they share a parish
 * (see security review: "Do not let ordinary parish peers SELECT every
 * sensitive profile column merely because they share a parish").
 *
 * NOTE: migration 053 `profiles_select_parish_peers` is row-level only and
 * still permits a peer to SELECT every column of a peer's row when querying
 * Supabase directly. This route enforces the column allow-list at the API
 * layer; closing the gap at the database layer (column-level privileges or a
 * security-barrier view) is a separate migration.
 *
 * Profile schema (migrations 002/003/027): id, auth_user_id, email, name,
 * phone, avatar_url, role, department_id, notification_preferences,
 * created_at, updated_at. There is no first_name / last_name / job_title
 * column; `name` is the display name.
 */

import { NextRequest, NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import {
  isParishAuthFailure,
  requireActiveParishMember,
} from "@/lib/parish/require-active-parish"

// Safe allow-list. Do not add email, phone, role, auth_user_id or
// notification_preferences here.
const SAFE_PROFILE_COLUMNS = "id, name, avatar_url, department_id"

const MAX_LIMIT = 500

type DirectoryProfile = {
  id: string
  name: string
  avatar_url: string | null
  department_id: string | null
}

export async function GET(request: NextRequest) {
  const auth = await requireActiveParishMember()
  if (isParishAuthFailure(auth)) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  // Platform developers without a selected parish have no directory scope.
  if (!auth.parishId) {
    return NextResponse.json({ error: "No active parish" }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const requestedLimit = Number(searchParams.get("limit") || MAX_LIMIT)
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.trunc(requestedLimit), 1), MAX_LIMIT)
    : MAX_LIMIT

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("parish_memberships")
    .select(`profile:profiles!inner(${SAFE_PROFILE_COLUMNS})`)
    .eq("parish_id", auth.parishId)
    .eq("status", "active")
    .limit(limit)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const members = (data ?? [])
    .map((row) => {
      const p = row.profile as unknown as DirectoryProfile | DirectoryProfile[] | null
      return Array.isArray(p) ? p[0] : p
    })
    .filter((p): p is DirectoryProfile => Boolean(p))
    .map((p) => ({
      id: p.id,
      name: p.name,
      avatar_url: p.avatar_url,
      department_id: p.department_id,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return NextResponse.json({ members })
}
