import { Metadata } from "next"
import { requireAdminOrDeveloper } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb"
import { DeveloperToolsClient } from "./_components/developer-tools-client"

export const metadata: Metadata = {
  title: "Developer Tools | Admin | Cyber Tech",
  description: "System health, diagnostics, and developer utilities",
}

export default async function DeveloperToolsPage() {
  const { user, profile } = await requireAdminOrDeveloper()
  const supabase = await createClient()

  // Fetch all profiles for role overview
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name, role, department_id, departments(name)")
    .order("name")

  // Count by role
  const roleCounts = (profiles ?? []).reduce<Record<string, number>>((acc, p) => {
    const role = (p as { role: string }).role
    acc[role] = (acc[role] ?? 0) + 1
    return acc
  }, {})

  // Get departments
  const { data: departments } = await supabase
    .from("departments")
    .select("id, name")
    .order("name")

  return (
    <div className="space-y-6">
      <AdminBreadcrumb items={[{ label: "Developer Tools" }]} />

      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Developer Tools</h1>
        <p className="text-muted-foreground">
          System diagnostics, health checks, and developer utilities
        </p>
      </div>

      <DeveloperToolsClient
        currentUserEmail={user.email ?? ""}
        currentUserRole={profile.role}
        roleCounts={roleCounts}
        totalUsers={profiles?.length ?? 0}
        departments={departments ?? []}
      />
    </div>
  )
}
