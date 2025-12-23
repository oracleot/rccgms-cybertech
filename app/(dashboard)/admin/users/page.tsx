import { Suspense } from "react"
import { UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { requireAdmin } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"
import { UserTable } from "@/components/admin/user-table"
import { RoleEditorModal } from "@/components/admin/role-editor"
import { InviteUserModal } from "@/components/admin/invite-user-modal"
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"
import type { Profile, Department } from "@/types/auth"

export const metadata = {
  title: "User Management | Admin | Cyber Tech",
  description: "Manage team members, roles, and permissions",
}

interface UserWithDepartment extends Profile {
  department: Department | null
}

async function getUsers(): Promise<UserWithDepartment[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("profiles")
    .select(`
      *,
      department:departments!fk_profiles_department(*)
    `)
    .order("name", { ascending: true })

  if (error) {
    console.error("Error fetching users:", error)
    return []
  }

  return data as unknown as UserWithDepartment[]
}

async function getDepartments(): Promise<Department[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("departments")
    .select("*")
    .order("name", { ascending: true })

  if (error) {
    console.error("Error fetching departments:", error)
    return []
  }

  return data
}

interface UsersPageProps {
  searchParams: Promise<{ invite?: string; edit?: string }>
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  await requireAdmin()
  const params = await searchParams
  const [users, departments] = await Promise.all([getUsers(), getDepartments()])
  const editUserId = params.edit

  return (
    <div className="space-y-6">
      <AdminBreadcrumb items={[{ label: "User Management" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage team members, roles, and permissions
          </p>
        </div>
        <Button asChild>
          <a href="/admin/users?invite=true">
            <UserPlus className="mr-2 h-4 w-4" />
            Invite User
          </a>
        </Button>
      </div>

      <Suspense fallback={<LoadingSkeleton className="h-96" />}>
        <UserTable users={users} departments={departments} />
      </Suspense>

      {/* Role Editor Modal - shown when edit param is present */}
      {editUserId && (
        <RoleEditorModal
          userId={editUserId}
          users={users}
          departments={departments}
        />
      )}

      {/* Invite User Modal - shown when invite param is present */}
      <InviteUserModal departments={departments} />
    </div>
  )
}
