import { Settings } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { TemplateEditor } from "@/components/admin/template-editor"
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb"

export const metadata = {
  title: "Livestream Templates | Admin | Cyber Tech",
  description: "Manage AI prompt templates for livestream descriptions",
}

export default async function LivestreamTemplatesPage() {
  const supabase = await createClient()
  
  // Check auth and role
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("auth_user_id", user.id)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- profile type inference issue
  const profileRole = (profile as any)?.role as string | undefined
  // Only admins can access this page
  if (!profileRole || !["admin", "developer"].includes(profileRole)) {
    redirect("/dashboard")
  }

  return (
    <div className="space-y-6">
      <AdminBreadcrumb items={[{ label: "Livestream Templates" }]} />
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">
            Livestream Templates
          </h1>
        </div>
        <p className="text-muted-foreground">
          Customize the AI prompts used to generate livestream descriptions
        </p>
      </div>

      {/* Template Editor */}
      <TemplateEditor />
    </div>
  )
}
