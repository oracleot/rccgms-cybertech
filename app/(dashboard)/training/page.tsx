import Link from "next/link"
import { GraduationCap, BookOpen, ChevronRight, Trophy, Sparkles } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { TrackCard } from "@/components/training/track-card"
import { EmptyState } from "@/components/shared/empty-state"
import { BlurFade } from "@/components/ui/blur-fade"
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text"
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
  const progressMap = new Map<string, ProgressWithDetails>()
  
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

  const isLeaderOrAdmin = profile?.role === "leader" || profile?.role === "lead_developer" || profile?.role === "developer" || profile?.role === "admin"
  
  // Calculate stats for the hero section
  const totalTracks = tracks.length
  const enrolledTracks = Array.from(progressMap.values()).length
  const completedTracks = Array.from(progressMap.values()).filter(p => p.status === "completed").length

  return (
    <div className="container max-w-6xl py-6 space-y-8">
      {/* Hero Header */}
      <BlurFade delay={0.1} inView>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border p-8">
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold tracking-tight">
                  <AnimatedGradientText 
                    colorFrom="hsl(var(--primary))" 
                    colorTo="hsl(var(--primary) / 0.6)"
                    speed={2}
                    className="text-3xl font-bold"
                  >
                    Training Tracks
                  </AnimatedGradientText>
                </h1>
              </div>
              <p className="text-muted-foreground max-w-lg">
                Build your skills with structured learning paths. Complete modules to earn certificates and level up your expertise.
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" className="group">
                <Link href="/training/my-progress">
                  <BookOpen className="h-4 w-4 mr-2 transition-transform group-hover:scale-110" />
                  My Progress
                </Link>
              </Button>
              {isLeaderOrAdmin && (
                <Button asChild variant="outline" className="group">
                  <Link href="/training/verifications">
                    Verifications
                    <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
          
          {/* Quick Stats */}
          {profile && (
            <div className="relative mt-6 grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-background/60 backdrop-blur-sm border p-4 text-center">
                <div className="flex items-center justify-center gap-1.5 text-2xl font-bold text-primary">
                  <Sparkles className="h-5 w-5" />
                  {totalTracks}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Available Tracks</p>
              </div>
              <div className="rounded-lg bg-background/60 backdrop-blur-sm border p-4 text-center">
                <div className="flex items-center justify-center gap-1.5 text-2xl font-bold text-blue-600 dark:text-blue-400">
                  <BookOpen className="h-5 w-5" />
                  {enrolledTracks}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Enrolled</p>
              </div>
              <div className="rounded-lg bg-background/60 backdrop-blur-sm border p-4 text-center">
                <div className="flex items-center justify-center gap-1.5 text-2xl font-bold text-green-600 dark:text-green-400">
                  <Trophy className="h-5 w-5" />
                  {completedTracks}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Completed</p>
              </div>
            </div>
          )}
        </div>
      </BlurFade>

      {/* Tracks grid */}
      {tracks && tracks.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tracks.map((track, index) => (
            <BlurFade key={track.id} delay={0.2 + index * 0.1} inView>
              <TrackCard
                track={track as TrackWithDepartment}
                progress={progressMap.get(track.id)}
                enrollmentCount={enrollmentCounts.get(track.id)}
              />
            </BlurFade>
          ))}
        </div>
      ) : (
        <BlurFade delay={0.2} inView>
          <EmptyState
            icon={<GraduationCap className="h-12 w-12" />}
            title="No Training Tracks Available"
            description="Training tracks will appear here once they are created and published by administrators."
          />
        </BlurFade>
      )}
    </div>
  )
}
