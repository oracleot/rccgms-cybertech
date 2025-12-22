import { Settings, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { TemplateEditor } from "@/components/admin/template-editor"

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profileRole = (profile as any)?.role as string | undefined
  // Only admins can access this page
  if (!profileRole || profileRole !== "admin") {
    redirect("/dashboard")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
        <Button variant="outline" asChild>
          <Link href="/admin">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Admin
          </Link>
        </Button>
      </div>

      {/* Template Editor */}
      <TemplateEditor />
    </div>
  )
}
