import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Lock } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { VideoStep } from "@/components/training/video-step"
import { DocumentStep } from "@/components/training/document-step"
import { StepCompleteButton } from "./step-complete-button"
import type { StepType } from "@/types/training"

interface StepPageProps {
  params: Promise<{ id: string; stepId: string }>
}

interface StepRow {
  id: string
  order: number
  title: string
  description: string | null
  type: StepType
  content_url: string | null
  required: boolean
  pass_score: number | null
}

export async function generateMetadata({ params }: StepPageProps) {
  const { stepId } = await params
  const supabase = await createClient()
  
  const { data } = await supabase
    .from("onboarding_steps")
    .select("title")
    .eq("id", stepId)
    .single()

  const step = data as { title: string } | null

  return {
    title: step?.title ? `${step.title} | Training` : "Training Step",
  }
}

export default async function StepPage({ params }: StepPageProps) {
  const { id: trackId, stepId } = await params
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

  // Get user's progress for this track
  const { data: progressData } = await supabase
    .from("volunteer_progress")
    .select("*")
    .eq("user_id", profile.id)
    .eq("track_id", trackId)
    .single()

  const progress = progressData as { id: string } | null

  if (!progress) {
    // Not enrolled, redirect to track page
    redirect(`/training/${trackId}`)
  }

  // Get the step
  const { data: stepData } = await supabase
    .from("onboarding_steps")
    .select("*")
    .eq("id", stepId)
    .single()

  const step = stepData as StepRow | null

  if (!step) {
    notFound()
  }

  // Get all steps for navigation
  const { data: allStepsData } = await supabase
    .from("onboarding_steps")
    .select("id, order, title")
    .eq("track_id", trackId)
    .order("order", { ascending: true })

  const steps = (allStepsData || []) as Array<{ id: string; order: number; title: string }>
  const currentIndex = steps.findIndex(s => s.id === stepId)
  const prevStep = currentIndex > 0 ? steps[currentIndex - 1] : null
  const nextStep = currentIndex < steps.length - 1 ? steps[currentIndex + 1] : null

  // Get completions
  const { data: completionsData } = await supabase
    .from("step_completions")
    .select("step_id, mentor_verified_by")
    .eq("volunteer_progress_id", progress.id)

  const completions = (completionsData || []) as Array<{ step_id: string; mentor_verified_by: string | null }>
  const completionMap = new Map(completions.map(c => [c.step_id, c]))

  // Check if current step is completed
  const currentCompletion = completionMap.get(stepId)
  const isCompleted = !!currentCompletion
  const isVerified = !!currentCompletion?.mentor_verified_by

  // Check if step is locked (previous step not completed)
  const isLocked = currentIndex > 0 && !completionMap.has(steps[currentIndex - 1].id)

  // Check if next step is accessible
  const nextStepLocked = nextStep ? !completionMap.has(stepId) : false

  // Determine if step requires verification
  const requiresVerification = step.type === "practical" || step.type === "shadowing"

  if (isLocked) {
    return (
      <div className="container max-w-4xl py-6 space-y-8">
        <Button variant="ghost" asChild className="-ml-4">
          <Link href={`/training/${trackId}`}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Track
          </Link>
        </Button>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Lock className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold">Step Locked</h2>
            <p className="text-muted-foreground mt-2 max-w-md">
              You need to complete the previous step before accessing this one.
            </p>
            {prevStep && (
              <Button asChild className="mt-4">
                <Link href={`/training/${trackId}/step/${prevStep.id}`}>
                  Go to Previous Step
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  const stepTypeLabels: Record<string, string> = {
    video: "Video Lesson",
    document: "Reading Material",
    quiz: "Knowledge Check",
    shadowing: "Shadowing Session",
    practical: "Hands-on Practice",
  }

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      {/* Back link */}
      <Button variant="ghost" asChild className="-ml-4">
        <Link href={`/training/${trackId}`}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Track
        </Link>
      </Button>

      {/* Step header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Step {step.order} of {steps.length}
              </p>
              <CardTitle className="text-2xl">{step.title}</CardTitle>
              {step.description && (
                <CardDescription className="text-base">
                  {step.description}
                </CardDescription>
              )}
            </div>
            <div className="flex flex-col gap-2 items-end">
              <Badge variant="outline">{stepTypeLabels[step.type] || step.type}</Badge>
              {step.required && <Badge>Required</Badge>}
              {isCompleted && (
                <Badge variant={isVerified ? "default" : "secondary"} className="bg-green-600">
                  {isVerified ? "Verified" : requiresVerification ? "Pending Verification" : "Completed"}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Step content */}
      {step.type === "video" && step.content_url && (
        <VideoStep videoUrl={step.content_url} title={step.title} />
      )}

      {step.type === "document" && step.content_url && (
        <DocumentStep 
          documentUrl={step.content_url} 
          title={step.title}
          description={step.description}
        />
      )}

      {(step.type === "practical" || step.type === "shadowing") && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center space-y-4">
              <h3 className="text-lg font-medium">
                {step.type === "practical" ? "Hands-on Practice" : "Shadowing Session"}
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                {step.type === "practical" 
                  ? "Complete the practical exercise and request verification from a mentor when ready."
                  : "Shadow an experienced team member during a service. Request verification once completed."}
              </p>
              {step.content_url && (
                <Button variant="outline" asChild>
                  <a href={step.content_url} target="_blank" rel="noopener noreferrer">
                    View Instructions
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {step.type === "quiz" && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              Quiz functionality coming soon. Mark as complete for now.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Complete button */}
      {!isCompleted && (
        <div className="flex justify-center">
          <StepCompleteButton
            progressId={progress.id}
            stepId={stepId}
            requiresVerification={requiresVerification}
          />
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t">
        {prevStep ? (
          <Button variant="outline" asChild>
            <Link href={`/training/${trackId}/step/${prevStep.id}`}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Link>
          </Button>
        ) : (
          <div />
        )}

        {nextStep && (
          <Button 
            variant={nextStepLocked ? "outline" : "default"} 
            asChild={!nextStepLocked}
            disabled={nextStepLocked}
          >
            {nextStepLocked ? (
              <span className="flex items-center">
                Complete this step first
                <Lock className="h-4 w-4 ml-2" />
              </span>
            ) : (
              <Link href={`/training/${trackId}/step/${nextStep.id}`}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            )}
          </Button>
        )}

        {!nextStep && isCompleted && (
          <Button asChild>
            <Link href={`/training/${trackId}`}>
              Finish Track
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  )
}
