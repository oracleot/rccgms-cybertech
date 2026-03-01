import { Metadata } from "next"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ROUTES } from "@/lib/constants"
import { ProfileForm } from "./_components/profile-form"
import { DisplaySettings } from "./_components/display-settings"
import { NotificationPreferences } from "@/components/settings/notification-preferences"
import { ChangePassword } from "@/components/settings/change-password"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export const metadata: Metadata = {
  title: "Settings | Cyber Tech",
  description: "Manage your profile and notification preferences",
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

export default async function SettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(ROUTES.LOGIN)
  }

  // Fetch profile with department (use FK hint to disambiguate - there are two FKs between profiles and departments)
  const { data: profileData, error: profileError } = await supabase
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

  // Fetch notification preferences
  const { data: notificationPrefs } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", profile.id)

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
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <Separator />

      <div className="grid gap-6">
        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              Update your personal information and profile picture
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm
              profile={profileFormData}
              departments={(departments as { id: string; name: string }[]) || []}
            />
          </CardContent>
        </Card>

        {/* Security Section */}
        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>
              Update your password to keep your account secure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePassword />
          </CardContent>
        </Card>

        {/* Display Settings Section */}
        <Card>
          <CardHeader>
            <CardTitle>Display Settings</CardTitle>
            <CardDescription>
              Customize the appearance of projections and extended displays
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DisplaySettings />
          </CardContent>
        </Card>

        {/* Notification Preferences Section */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>
              Choose how and when you want to receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NotificationPreferences
              profileId={profile.id}
              preferences={((notificationPrefs || []).map((pref) => ({
                id: pref.id,
                profile_id: pref.user_id,
                notification_type: pref.notification_type,
                email_enabled: pref.email_enabled ?? false,
                sms_enabled: pref.sms_enabled ?? false,
                reminder_timing: pref.reminder_timing,
              })))}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
