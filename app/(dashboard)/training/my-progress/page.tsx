import { redirect } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, GraduationCap } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { MyProgressSummary } from "@/components/training/my-progress-summary"
import { BlurFade } from "@/components/ui/blur-fade"
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text"
import type { ProgressWithDetails, TrackWithDepartment } from "@/types/training"

export const metadata = {
  title: "My Progress | Training",
  description: "Track your training progress",
}

export default async function MyProgressPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login")
  }

  // Get user's profile
  const { data: profileData } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .single()

  const profile = profileData as { id: string } | null

  if (!profile) {
    redirect("/login")
  }

  // Get all progress records for this user
  const { data: progressRaw } = await supabase
    .from("member_progress")
    .select(`
      *,
      track:onboarding_tracks(
        id,
        name,
        description,
        estimated_weeks,
        department:departments(id, name)
      )
    `)
    .eq("user_id", profile.id)
    .order("started_at", { ascending: false })

  interface ProgressRow {
    id: string
    track_id: string
    user_id: string
    status: string
    started_at: string
    completed_at: string | null
    track: TrackWithDepartment
  }

  const progressData = (progressRaw || []) as ProgressRow[]

  // Calculate completion stats for each progress
  const progressWithDetails: ProgressWithDetails[] = []
  
  for (const progress of progressData) {
    const { data: steps } = await supabase
      .from("onboarding_steps")
      .select("id")
      .eq("track_id", progress.track_id)

    const { data: completions } = await supabase
      .from("step_completions")
      .select("id")
      .eq("member_progress_id", progress.id)

    const totalSteps = steps?.length || 0
    const completedSteps = completions?.length || 0
    const percentComplete = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0

    progressWithDetails.push({
      ...progress,
      track: progress.track,
      user: profile as ProgressWithDetails["user"],
      completedSteps,
      totalSteps,
      percentComplete,
    } as ProgressWithDetails)
  }

  // Split into active and completed
  const activeEnrollments = progressWithDetails.filter(p => p.status === "in_progress")
  const completedTracks = progressWithDetails.filter(p => p.status === "completed")

  return (
    <div className="container max-w-4xl py-6 space-y-8">
      {/* Header */}
      <BlurFade delay={0.1} inView>
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild className="-ml-4 group">
            <Link href="/training">
              <ChevronLeft className="h-4 w-4 mr-1 transition-transform group-hover:-translate-x-1" />
              All Tracks
            </Link>
          </Button>
        </div>
      </BlurFade>

      <BlurFade delay={0.15} inView>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <GraduationCap className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              <AnimatedGradientText 
                colorFrom="hsl(var(--primary))" 
                colorTo="hsl(var(--primary) / 0.6)"
                speed={2}
                className="text-3xl font-bold"
              >
                My Training Progress
              </AnimatedGradientText>
            </h1>
            <p className="text-muted-foreground">
              Track your learning journey and achievements
            </p>
          </div>
        </div>
      </BlurFade>

      <BlurFade delay={0.2} inView>
        <MyProgressSummary
          activeEnrollments={activeEnrollments}
          completedTracks={completedTracks}
        />
      </BlurFade>
    </div>
  )
}
