import { Metadata } from "next"
import { requireAdminOrDeveloper } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb"
import { DeveloperToolsClient } from "./_components/developer-tools-client"

export const metadata: Metadata = {
  title: "Fusion Control Center | Admin",
  description: "Fusion platform operations, architecture, and diagnostics",
}

export default async function DeveloperToolsPage() {
  const { user, profile } = await requireAdminOrDeveloper()
  const isPlatformDeveloper = ["lead_developer", "developer"].includes(profile.role)
  let roleCounts: Record<string, number> = {}
  let totalUsers = 0
  let departments: Array<{ id: string; name: string }> = []

  // Platform admins only get the organisation/parish summary through the
  // dedicated, read-only endpoint. Do not fetch profiles or departments here.
  if (isPlatformDeveloper) {
    const supabase = await createClient()
    const [{ data: profiles }, { data: departmentRows }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, name, role, department_id, departments!fk_profiles_department(name)")
        .order("name"),
      supabase.from("departments").select("id, name").order("name"),
    ])

    roleCounts = (profiles ?? []).reduce<Record<string, number>>((acc, p) => {
      const role = (p as { role: string }).role
      acc[role] = (acc[role] ?? 0) + 1
      return acc
    }, {})
    totalUsers = profiles?.length ?? 0
    departments = departmentRows ?? []
  }

  return (
    <div className="space-y-6">
      <AdminBreadcrumb items={[{ label: profile.role === "admin" ? "Platform setup" : "Control Center" }]} />

      <div className="space-y-1">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">{profile.role === "admin" ? "Platform setup" : "Fusion Control Center"}</h1>
            <p className="max-w-2xl text-muted-foreground">
              {profile.role === "admin"
                ? "View organisations and parishes available in Fusion. Platform changes are managed by developers."
                : "A live operations workspace for Fusion health, architecture, organisations, and platform diagnostics."}
            </p>
          </div>
          {profile.role !== "admin" && (
            <div className="inline-flex w-fit items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
              Developer workspace
            </div>
          )}
        </div>
      </div>

      <DeveloperToolsClient
        currentUserEmail={user.email ?? ""}
        currentUserRole={profile.role}
        roleCounts={roleCounts}
        totalUsers={totalUsers}
        departments={departments}
      />
    </div>
  )
}
