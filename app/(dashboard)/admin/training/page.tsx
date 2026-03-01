import { redirect } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Plus, GraduationCap } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/shared/empty-state"

export const metadata = {
  title: "Manage Training | Admin",
  description: "Manage training tracks and steps",
}

export default async function AdminTrainingPage() {
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

  if (!profile || !["admin", "developer"].includes(profile.role)) {
    redirect("/training")
  }

  // Get all tracks with step counts
  const { data: tracksData } = await supabase
    .from("onboarding_tracks")
    .select(`
      *,
      department:departments(id, name),
      steps:onboarding_steps(count),
      enrollments:volunteer_progress(count)
    `)
    .order("name", { ascending: true })

  interface TrackRow {
    id: string
    name: string
    description: string | null
    is_active: boolean
    estimated_weeks: number | null
    department: { id: string; name: string } | null
    steps: { count: number }[] | { count: number }
    enrollments: { count: number }[] | { count: number }
  }

  const tracks = (tracksData || []) as TrackRow[]

  // Get departments for the create form
  const { data: _departments } = await supabase
    .from("departments")
    .select("id, name")
    .order("name")

  return (
    <div className="container max-w-6xl py-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" asChild className="-ml-4">
          <Link href="/admin">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Admin
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Training Management</h1>
          <p className="text-muted-foreground">
            Create and manage training tracks for volunteers
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/training/new">
            <Plus className="h-4 w-4 mr-2" />
            New Track
          </Link>
        </Button>
      </div>

      {/* Tracks list */}
      {tracks && tracks.length > 0 ? (
        <div className="grid gap-4">
          {tracks.map((track) => {
            const stepCount = Array.isArray(track.steps) ? track.steps.length : 
              (track.steps as { count: number })?.count ?? 0
            const enrollmentCount = Array.isArray(track.enrollments) ? track.enrollments.length :
              (track.enrollments as { count: number })?.count ?? 0

            return (
              <Card key={track.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {track.name}
                        {!track.is_active && (
                          <Badge variant="outline" className="font-normal">Draft</Badge>
                        )}
                      </CardTitle>
                      <CardDescription>{track.description || "No description"}</CardDescription>
                    </div>
                    <Badge variant="secondary">
                      {track.department?.name || "General"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-6 text-sm text-muted-foreground">
                      <span>{stepCount} steps</span>
                      <span>{enrollmentCount} enrolled</span>
                      {track.estimated_weeks && (
                        <span>{track.estimated_weeks} weeks</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/training/${track.id}`}>
                          Edit Track
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/training/${track.id}`}>
                          Preview
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={<GraduationCap className="h-12 w-12" />}
          title="No Training Tracks"
          description="Create your first training track to help volunteers learn and grow."
          action={
            <Button asChild>
              <Link href="/admin/training/new">
                <Plus className="h-4 w-4 mr-2" />
                Create Track
              </Link>
            </Button>
          }
        />
      )}
    </div>
  )
}
