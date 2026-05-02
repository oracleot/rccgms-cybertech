import { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { ROUTES } from "@/lib/constants"
import { DisplaySettings } from "./_components/display-settings"
import { NotificationPreferences } from "@/components/settings/notification-preferences"
import { ChangePassword } from "@/components/settings/change-password"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Code2, Brain, ExternalLink } from "lucide-react"

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

        {/* Developer Settings — visible only to developer and lead_developer */}
        {(profileData.role === "developer" || profileData.role === "lead_developer") && (
          <Card className="border-violet-200 dark:border-violet-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-violet-700 dark:text-violet-400">
                <Code2 className="h-5 w-5" />
                Developer Settings
              </CardTitle>
              <CardDescription>
                Tools and settings exclusive to the developer team
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Button variant="outline" asChild className="justify-start gap-2">
                  <Link href={ROUTES.ADMIN_DEVELOPER_TOOLS}>
                    <Code2 className="h-4 w-4" />
                    Developer Workshop
                    <ExternalLink className="h-3.5 w-3.5 ml-auto opacity-50" />
                  </Link>
                </Button>
                <Button variant="outline" asChild className="justify-start gap-2">
                  <Link href={ROUTES.ADMIN_ML_TRAINING}>
                    <Brain className="h-4 w-4" />
                    ML Training Dashboard
                    <ExternalLink className="h-3.5 w-3.5 ml-auto opacity-50" />
                  </Link>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                These tools are only available to the developer team. Admin users do not have access.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
