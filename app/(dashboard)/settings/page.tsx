import { Metadata } from "next"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ROUTES } from "@/lib/constants"
import { DisplaySettings } from "./_components/display-settings"
import { NotificationPreferences } from "@/components/settings/notification-preferences"
import { ChangePassword } from "@/components/settings/change-password"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export const metadata: Metadata = {
  title: "Settings | Cyber Tech",
  description: "Manage your account settings and preferences",
}

export default async function SettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(ROUTES.LOGIN)
  }

  // Fetch profile ID for notification preferences
  const { data: profileData } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single()

  if (!profileData) {
    redirect(ROUTES.LOGIN)
  }

  // Fetch notification preferences
  const { data: notificationPrefs } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", profileData.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account preferences and security
        </p>
      </div>

      <Separator />

      <div className="grid gap-6">
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
              profileId={profileData.id}
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
