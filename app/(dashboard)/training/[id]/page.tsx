import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Sparkles } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { BlurFade } from "@/components/ui/blur-fade"
import { TrackOverview } from "@/components/training/track-overview"
import { StepList } from "@/components/training/step-list"
import { EnrollButton } from "./enroll-button"
import type { TrackWithDetails, StepWithCompletion, ProgressWithDetails, TrainingStep } from "@/types/training"

interface TrackDetailPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: TrackDetailPageProps) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data } = await supabase
    .from("onboarding_tracks")
    .select("name")
    .eq("id", id)
    .single()

  const track = data as { name: string } | null

  return {
    title: track?.name ? `${track.name} | Training` : "Training Track",
  }
}

interface TrackRow {
  id: string
  name: string
  description: string | null
  estimated_weeks: number | null
  is_active: boolean
  department_id: string
  created_at: string
  updated_at: string
  department: { id: string; name: string } | null
  steps: TrainingStep[]
}

export default async function TrackDetailPage({ params }: TrackDetailPageProps) {
  const { id } = await params
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

  // Get track with department and steps
  const { data: trackData, error } = await supabase
    .from("onboarding_tracks")
    .select(`
      *,
      department:departments(id, name),
      steps:onboarding_steps(*)
    `)
    .eq("id", id)
    .single()

  const track = trackData as TrackRow | null

  if (error || !track) {
    notFound()
  }

  // Sort steps by order
  const steps = (track.steps || []).sort((a: TrainingStep, b: TrainingStep) => a.order - b.order)

  // Get user's progress for this track
  const { data: progressData } = await supabase
    .from("volunteer_progress")
    .select("*")
    .eq("user_id", profile.id)
    .eq("track_id", id)
    .single()

  const progress = progressData as {
    id: string
    user_id: string
    track_id: string
    status: string
    started_at: string
    completed_at: string | null
  } | null

  // Get step completions if enrolled
  let completions: Array<{ step_id: string; mentor_verified_by: string | null }> = []
  if (progress) {
    const { data: completionData } = await supabase
      .from("step_completions")
      .select("step_id, mentor_verified_by")
      .eq("volunteer_progress_id", progress.id)
    
    completions = (completionData || []) as Array<{ step_id: string; mentor_verified_by: string | null }>
  }

  // Build step completion map
  const completionMap = new Map(completions.map(c => [c.step_id, c]))

  // Prepare steps with completion status
  const stepsWithCompletion: StepWithCompletion[] = steps.map(step => {
    const completion = completionMap.get(step.id)
    return {
      ...step,
      completion: completion ? { ...completion } as unknown as StepWithCompletion["completion"] : null,
      isComplete: !!completion,
      isVerified: !!completion?.mentor_verified_by,
    }
  })

  // Find current step index (first incomplete step)
  const currentStepIndex = stepsWithCompletion.findIndex(s => !s.isComplete)

  // Calculate progress
  const totalSteps = steps.length
  const requiredSteps = steps.filter(s => s.required).length
  const completedSteps = completions.length
  const percentComplete = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0

  const trackWithDetails = {
    ...track,
    steps,
    totalSteps,
    requiredSteps,
  } as TrackWithDetails

  const progressWithDetails = progress ? {
    ...progress,
    track: track as ProgressWithDetails["track"],
    user: profile as ProgressWithDetails["user"],
    completedSteps,
    totalSteps,
    percentComplete,
  } as ProgressWithDetails : null

  return (
    <div className="container max-w-4xl py-6 space-y-8">
      {/* Back link */}
      <BlurFade delay={0.05} inView>
        <Button variant="ghost" asChild className="-ml-4 group">
          <Link href="/training">
            <ChevronLeft className="h-4 w-4 mr-1 transition-transform group-hover:-translate-x-1" />
            All Tracks
          </Link>
        </Button>
      </BlurFade>

      {/* Track overview */}
      <BlurFade delay={0.1} inView>
        <TrackOverview 
          track={trackWithDetails}
          progress={progressWithDetails}
        />
      </BlurFade>

      {/* Enrollment button if not enrolled */}
      {!progress && (
        <BlurFade delay={0.15} inView>
          <EnrollButton trackId={id} />
        </BlurFade>
      )}

      {/* Steps list - only show if enrolled */}
      {progress && (
        <BlurFade delay={0.2} inView>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Training Steps</h2>
              <span className="text-sm text-muted-foreground">
                {progressWithDetails?.completedSteps || 0} of {steps.length} completed
              </span>
            </div>
            <StepList
              trackId={id}
              steps={stepsWithCompletion}
              currentStepIndex={currentStepIndex === -1 ? steps.length - 1 : currentStepIndex}
            />
          </div>
        </BlurFade>
      )}

      {/* Preview steps if not enrolled */}
      {!progress && steps.length > 0 && (
        <BlurFade delay={0.2} inView>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">What You&apos;ll Learn</h2>
            </div>
            <div className="space-y-2">
              {steps.slice(0, 5).map((step, index) => (
                <div 
                  key={step.id}
                  className="flex items-center gap-3 p-4 rounded-xl border bg-gradient-to-r from-muted/30 to-transparent hover:from-muted/50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                    {index + 1}
                  </div>
                  <span className="font-medium">{step.title}</span>
                </div>
              ))}
              {steps.length > 5 && (
                <p className="text-sm text-muted-foreground text-center py-3 border-t">
                  + {steps.length - 5} more steps to explore
                </p>
              )}
            </div>
          </div>
        </BlurFade>
      )}
    </div>
  )
}
