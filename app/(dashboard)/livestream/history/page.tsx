import { Video, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { HistoryList } from "@/components/livestream/history-list"

export const metadata = {
  title: "Description History | Cyber Tech",
  description: "View your generated livestream descriptions",
}

export default async function HistoryPage() {
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

  const profileRole = (profile as { role: string } | null)?.role
  if (!profileRole || !["admin", "lead_developer", "leader"].includes(profileRole)) {
    redirect("/dashboard")
  }

  // Fetch initial history
  const { data: livestreams } = await supabase
    .from("livestreams")
    .select(`
      id,
      title,
      speaker,
      youtube_description,
      facebook_description,
      created_at,
      rota:rotas(id, date)
    `)
    .order("created_at", { ascending: false })
    .limit(20)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Video className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">
              Description History
            </h1>
          </div>
          <p className="text-muted-foreground">
            View and reuse your previously generated descriptions
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/livestream">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Generator
          </Link>
        </Button>
      </div>

      {/* History List */}
      <HistoryList initialData={(livestreams || []) as Parameters<typeof HistoryList>[0]["initialData"]} />
    </div>
  )
}
