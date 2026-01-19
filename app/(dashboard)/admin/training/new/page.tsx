import { redirect } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { TrackEditor } from "@/components/admin/track-editor"
import { createTrack } from "@/app/(dashboard)/training/actions"
import type { Department } from "@/types/auth"

export const metadata = {
  title: "New Training Track | Admin",
  description: "Create a new training track",
}

export default async function NewTrackPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login")
  }

  // Check if user is admin
  const { data: profileData } = await supabase
    .from("profiles")
    .select("role")
    .eq("auth_user_id", user.id)
    .single()

  const profile = profileData as { role: string } | null

  if (!profile || profile.role !== "admin") {
    redirect("/training")
  }

  // Get departments
  const { data: departmentsData } = await supabase
    .from("departments")
    .select("id, name")
    .order("name")

  return (
    <div className="container max-w-2xl py-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" asChild className="-ml-4">
          <Link href="/admin/training">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Training Management
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Training Track</h1>
        <p className="text-muted-foreground">
          Set up a new learning path for volunteers
        </p>
      </div>

      <TrackEditor
        departments={(departmentsData || []) as Department[]}
        onSubmit={createTrack}
      />
    </div>
  )
}
