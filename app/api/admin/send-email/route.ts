import { NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendBatchEmails } from "@/lib/notifications/email"
import { validateApiRole } from "@/lib/auth/guards"

export async function POST(request: NextRequest) {
  const roleCheck = await validateApiRole(["lead_developer", "developer", "admin"])
  if (!roleCheck.authorized) {
    return new Response(JSON.stringify({ error: roleCheck.error }), {
      status: roleCheck.status,
      headers: { "Content-Type": "application/json" },
    })
  }

  const body = await request.json()
  const { subject, html, recipientFilter, customEmails: rawCustom } = body as {
    subject: string
    html: string
    recipientFilter: "all" | "pending_design" | "role_member" | "role_leader" | "custom"
    customEmails?: string[]
  }

  if (!subject?.trim() || !html?.trim()) {
    return new Response(JSON.stringify({ error: "Subject and body are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const admin = createAdminClient()
  let emails: string[] = []

  if (recipientFilter === "custom" && Array.isArray(rawCustom)) {
    emails = rawCustom.filter((e) => e.includes("@"))
  } else if (recipientFilter === "pending_design") {
    const { data } = await admin
      .from("design_requests")
      .select("profiles!design_requests_requested_by_fkey(auth_user_id)")
      .eq("status", "pending")

    const userIds = (data ?? [])
      .map((r) => (r.profiles as unknown as { auth_user_id: string } | null)?.auth_user_id)
      .filter((id): id is string => Boolean(id))

    const { data: users } = await admin.auth.admin.listUsers()
    emails = (users?.users ?? [])
      .filter((u) => userIds.includes(u.id) && u.email)
      .map((u) => u.email!)
  } else {
    const { data: users } = await admin.auth.admin.listUsers()
    const allUsers = users?.users ?? []

    if (recipientFilter === "all") {
      emails = allUsers.filter((u) => u.email).map((u) => u.email!)
    } else {
      const roleValue = recipientFilter === "role_member" ? "member" : "leader"
      const { data: profiles } = await admin
        .from("profiles")
        .select("auth_user_id")
        .eq("role", roleValue)

      const ids = new Set((profiles ?? []).map((p: { auth_user_id: string }) => p.auth_user_id))
      emails = allUsers.filter((u) => ids.has(u.id) && u.email).map((u) => u.email!)
    }
  }

  if (emails.length === 0) {
    return new Response(JSON.stringify({ error: "No recipients found" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const result = await sendBatchEmails(emails.map((to) => ({ to, subject, html })))

  return Response.json({
    success: result.success,
    failed: result.failed,
    total: emails.length,
    errors: result.errors,
  })
}

export async function GET(request: NextRequest) {
  const roleCheck = await validateApiRole(["lead_developer", "developer", "admin"])
  if (!roleCheck.authorized) {
    return new Response(JSON.stringify({ error: roleCheck.error }), {
      status: roleCheck.status,
      headers: { "Content-Type": "application/json" },
    })
  }

  const { searchParams } = new URL(request.url)
  const filter = searchParams.get("filter") ?? "all"
  const admin = createAdminClient()
  const { data: users } = await admin.auth.admin.listUsers()
  const allUsers = users?.users ?? []

  if (filter === "all") {
    return Response.json({ count: allUsers.filter((u) => u.email).length })
  }

  if (filter === "pending_design") {
    const { data } = await admin
      .from("design_requests")
      .select("profiles!design_requests_requested_by_fkey(auth_user_id)")
      .eq("status", "pending")

    const userIds = new Set(
      (data ?? [])
        .map((r) => (r.profiles as unknown as { auth_user_id: string } | null)?.auth_user_id)
        .filter(Boolean)
    )
    return Response.json({ count: allUsers.filter((u) => userIds.has(u.id) && u.email).length })
  }

  const roleMap: Record<string, string> = { role_member: "member", role_leader: "leader" }
  const role = roleMap[filter]
  if (role) {
    const { data: profiles } = await admin.from("profiles").select("auth_user_id").eq("role", role)
    const ids = new Set((profiles ?? []).map((p: { auth_user_id: string }) => p.auth_user_id))
    return Response.json({ count: allUsers.filter((u) => ids.has(u.id) && u.email).length })
  }

  return Response.json({ count: 0 })
}
