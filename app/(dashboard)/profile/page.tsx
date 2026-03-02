import { Metadata } from "next"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ROUTES } from "@/lib/constants"
import { ProfileForm } from "./_components/profile-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Profile | Cyber Tech",
  description: "Manage your profile and personal information",
}

interface ProfileWithDepartment {
  id: string
  name: string
  phone: string | null
  avatar_url: string | null
  role: string
  department_id: string | null
  departments: { id: string; name: string } | null
}

export default async function ProfilePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(ROUTES.LOGIN)
  }

  // Fetch profile with department (use FK hint to disambiguate)
  const { data: profileData } = await supabase
    .from("profiles")
    .select(`
      id,
      name,
      phone,
      avatar_url,
      role,
      department_id,
      departments!fk_profiles_department (
        id,
        name
      )
    `)
    .eq("auth_user_id", user.id)
    .single()

  const profile = profileData as unknown as ProfileWithDepartment | null

  if (!profile) {
    redirect(ROUTES.LOGIN)
  }

  // Fetch departments for selection
  const { data: departments } = await supabase
    .from("departments")
    .select("id, name")
    .order("name")

  const profileFormData = {
    id: profile.id,
    email: user.email || "",
    name: profile.name,
    phone: profile.phone,
    avatarUrl: profile.avatar_url,
    role: profile.role,
    departmentId: profile.department_id,
    department: profile.departments,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">
          Manage your personal information and profile picture
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>
            Update your name, photo, phone number, and department
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            profile={profileFormData}
            departments={(departments as { id: string; name: string }[]) || []}
          />
        </CardContent>
      </Card>
    </div>
  )
}
