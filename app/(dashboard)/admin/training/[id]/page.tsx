import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { TrackEditor } from "@/components/admin/track-editor"
import { StepEditor } from "@/components/admin/step-editor"
import { 
  updateTrack, 
  createStep, 
  updateStep, 
  deleteStep, 
  reorderSteps 
} from "@/app/(dashboard)/training/actions"
import type { Department } from "@/types/auth"
import type { TrainingStep } from "@/types/training"

interface EditTrackPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: EditTrackPageProps) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data } = await supabase
    .from("onboarding_tracks")
    .select("name")
    .eq("id", id)
    .single()

  const track = data as { name: string } | null

  return {
    title: track?.name ? `Edit: ${track.name} | Admin` : "Edit Track",
  }
}

export default async function EditTrackPage({ params }: EditTrackPageProps) {
  const { id } = await params
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

  // Get the track
  const { data: trackData } = await supabase
    .from("onboarding_tracks")
    .select("*")
    .eq("id", id)
    .single()

  const track = trackData as {
    id: string
    name: string
    description: string | null
    department_id: string
    estimated_weeks: number | null
    is_active: boolean
  } | null

  if (!track) {
    notFound()
  }

  // Get steps
  const { data: stepsData } = await supabase
    .from("onboarding_steps")
    .select("*")
    .eq("track_id", id)
    .order("order", { ascending: true })

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
        <h1 className="text-3xl font-bold tracking-tight">Edit Track</h1>
        <p className="text-muted-foreground">
          Update track details and manage steps
        </p>
      </div>

      <TrackEditor
        departments={(departmentsData || []) as Department[]}
        track={track}
        onSubmit={updateTrack}
      />

      <StepEditor
        trackId={id}
        steps={(stepsData || []) as TrainingStep[]}
        onCreateStep={createStep}
        onUpdateStep={updateStep}
        onDeleteStep={deleteStep}
        onReorderSteps={reorderSteps}
      />
    </div>
  )
}
