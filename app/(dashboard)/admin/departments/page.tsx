import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { requireAdminOrDeveloper } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"
import { PositionManager } from "@/components/admin/position-manager"
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb"
import type { Profile, Department, Position } from "@/types/auth"

export const metadata = {
  title: "Department Management | Admin | Cyber Tech",
  description: "Configure departments and positions",
}

interface DepartmentWithDetails extends Department {
  positions: Position[]
  leader: Profile | null
}

async function getDepartments(): Promise<DepartmentWithDetails[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("departments")
    .select(`
      *,
      positions(*),
      leader:profiles!departments_leader_id_fkey(*)
    `)
    .order("name", { ascending: true })

  if (error) {
    console.error("Error fetching departments:", error)
    return []
  }

  return data as unknown as DepartmentWithDetails[]
}

async function getLeaders(): Promise<Profile[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .in("role", ["admin", "leader"])
    .order("name", { ascending: true })

  if (error) {
    console.error("Error fetching leaders:", error)
    return []
  }

  return data
}

interface DepartmentsPageProps {
  searchParams: Promise<{ add?: string; edit?: string }>
}

export default async function DepartmentsPage({ searchParams }: DepartmentsPageProps) {
  await requireAdminOrDeveloper()
  const params = await searchParams
  const [departments, leaders] = await Promise.all([getDepartments(), getLeaders()])
  const showAddForm = params.add === "true"
  const editDeptId = params.edit

  return (
    <div className="space-y-6">
      <AdminBreadcrumb items={[{ label: "Departments" }]} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Departments</h1>
          <p className="text-muted-foreground">
            Configure departments and positions for the tech team
          </p>
        </div>
        <Button asChild>
          <a href="/admin/departments?add=true">
            <Plus className="mr-2 h-4 w-4" />
            Add Department
          </a>
        </Button>
      </div>

      <PositionManager
        departments={departments}
        leaders={leaders}
        showAddForm={showAddForm}
        editDeptId={editDeptId}
      />
    </div>
  )
}
