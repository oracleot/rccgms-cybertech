import Link from "next/link"
import { GraduationCap, BookOpen, ChevronRight } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { TrackCard } from "@/components/training/track-card"
import { EmptyState } from "@/components/shared/empty-state"
import type { TrackWithDepartment, ProgressWithDetails } from "@/types/training"

export const metadata = {
  title: "Training | Cyber Tech",
  description: "Complete training modules and track progress",
}

export default async function TrainingPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Get user's profile
  const { data: profileData } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", user?.id ?? "")
    .single()

  const profile = profileData as { id: string; role: string } | null

  // Get all active training tracks with department info
  const { data: tracksRaw } = await supabase
    .from("onboarding_tracks")
    .select(`
      *,
      department:departments(id, name)
    `)
    .eq("is_active", true)
    .order("name", { ascending: true })

  interface TrackRow {
    id: string
    name: string
    description: string | null
    estimated_weeks: number | null
    is_active: boolean
    department_id: string
    department: { id: string; name: string } | null
  }

  const tracks = (tracksRaw || []) as TrackRow[]

  // Get user's progress for enrolled tracks
  let progressMap = new Map<string, ProgressWithDetails>()
  
  if (profile) {
    const { data: progressRaw } = await supabase
      .from("volunteer_progress")
      .select(`
        *,
        track:onboarding_tracks(
          id,
          name,
          description,
          department:departments(id, name)
        )
      `)
      .eq("user_id", profile.id)

    interface ProgressRow {
      id: string
      track_id: string
      user_id: string
      status: string
      started_at: string
      completed_at: string | null
      track: {
        id: string
        name: string
        description: string | null
        department: { id: string; name: string } | null
      }
    }

    const progressData = (progressRaw || []) as ProgressRow[]

    // Get step counts for progress calculation
    for (const progress of progressData) {
      const { data: steps } = await supabase
        .from("onboarding_steps")
        .select("id")
        .eq("track_id", progress.track_id)

      const { data: completions } = await supabase
        .from("step_completions")
        .select("id")
        .eq("volunteer_progress_id", progress.id)

      const totalSteps = steps?.length || 0
      const completedSteps = completions?.length || 0
      const percentComplete = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0

      progressMap.set(progress.track_id, {
        ...progress,
        completedSteps,
        totalSteps,
        percentComplete,
      } as ProgressWithDetails)
    }
  }

  // Get enrollment counts for each track
  const enrollmentCounts = new Map<string, number>()
  for (const track of tracks || []) {
    const { count } = await supabase
      .from("volunteer_progress")
      .select("id", { count: "exact", head: true })
      .eq("track_id", track.id)
    
    enrollmentCounts.set(track.id, count || 0)
  }

  const isLeaderOrAdmin = profile?.role === "leader" || profile?.role === "admin"

  return (
    <div className="container max-w-6xl py-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Training Tracks</h1>
          <p className="text-muted-foreground">
            Build your skills with structured learning paths
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/training/my-progress">
              <BookOpen className="h-4 w-4 mr-2" />
              My Progress
            </Link>
          </Button>
          {isLeaderOrAdmin && (
            <Button asChild variant="outline">
              <Link href="/training/verifications">
                Verifications
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Tracks grid */}
      {tracks && tracks.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tracks.map((track) => (
            <TrackCard
              key={track.id}
              track={track as TrackWithDepartment}
              progress={progressMap.get(track.id)}
              enrollmentCount={enrollmentCounts.get(track.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<GraduationCap className="h-12 w-12" />}
          title="No Training Tracks Available"
          description="Training tracks will appear here once they are created and published by administrators."
        />
      )}
    </div>
  )
}
