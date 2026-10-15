import { Metadata } from "next"
import { createClient } from "@/lib/supabase/server"
import { getFusionContext } from "@/lib/parish/context"
import { redirect } from "next/navigation"
import { ROUTES } from "@/lib/constants"
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb"
import { ParishAdminClient } from "./_components/parish-admin-client"

export const metadata: Metadata = {
  title: "Parish Management | Admin",
  description: "Manage parish members, requests, profile, and feature access",
}

export default async function ParishAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(ROUTES.LOGIN)

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single()
  if (!profile) redirect(ROUTES.LOGIN)

  const ctx = await getFusionContext()

  // Access: parish_admin in any parish, OR platform developer (explicit override)
  const isPlatformDeveloper = ["lead_developer", "developer"].includes(profile.role)
  const isParishAdmin = ctx?.activeParish?.parishRole === "parish_admin"

  if (!isParishAdmin && !isPlatformDeveloper) {
    redirect(ROUTES.DASHBOARD)
  }

  return (
    <div className="space-y-6">
      <AdminBreadcrumb items={[{ label: "Parish" }]} />

      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Parish Management</h1>
        <p className="text-muted-foreground">
          Manage members, review membership requests, and configure parish settings
        </p>
      </div>

      <ParishAdminClient profileId={profile.id} profileRole={profile.role} />
    </div>
  )
}
