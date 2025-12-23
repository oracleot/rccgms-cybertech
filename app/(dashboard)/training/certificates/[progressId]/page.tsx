import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Download, Printer } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { CertificateTemplate } from "@/components/training/certificate-template"
import type { CertificateData } from "@/types/training"

interface CertificatePageProps {
  params: Promise<{ progressId: string }>
}

export async function generateMetadata({ params }: CertificatePageProps) {
  const { progressId } = await params
  const supabase = await createClient()
  
  const { data: progress } = await supabase
    .from("volunteer_progress")
    .select("track:onboarding_tracks(name)")
    .eq("id", progressId)
    .single()

  const progressData = progress as { track?: { name?: string } } | null

  return {
    title: progressData?.track?.name 
      ? `Certificate: ${progressData.track.name}` 
      : "Training Certificate",
  }
}

interface ProgressRecord {
  id: string
  user_id: string
  track_id: string
  status: string
  completed_at: string | null
  track: {
    id: string
    name: string
    department: { id: string; name: string } | null
  } | null
}

export default async function CertificatePage({ params }: CertificatePageProps) {
  const { progressId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login")
  }

  // Get user's profile
  const { data: profileData } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single()

  const profile = profileData as { id: string; role: string } | null

  if (!profile) {
    redirect("/login")
  }

  // Get the progress record
  const { data: progressRaw } = await supabase
    .from("volunteer_progress")
    .select(`
      *,
      track:onboarding_tracks(
        id,
        name,
        department:departments(id, name)
      )
    `)
    .eq("id", progressId)
    .single()

  const progress = progressRaw as ProgressRecord | null

  if (!progress) {
    notFound()
  }

  // Verify user owns this progress or is admin
  if (progress.user_id !== profile.id && profile.role !== "admin") {
    redirect("/training/my-progress")
  }

  // Check if track is completed
  if (progress.status !== "completed") {
    redirect(`/training/${progress.track_id}`)
  }

  // Get the user who completed the track
  const { data: completedByProfileData } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", progress.user_id)
    .single()

  const completedByProfile = completedByProfileData as { name: string } | null

  const certificateData: CertificateData = {
    userName: completedByProfile?.name || "Unknown",
    trackName: progress.track?.name || "Unknown Track",
    departmentName: progress.track?.department?.name || "General",
    completedAt: progress.completed_at || new Date().toISOString(),
    certificateId: progress.id,
  }

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <Button variant="ghost" asChild className="-ml-4">
          <Link href="/training/my-progress">
            <ChevronLeft className="h-4 w-4 mr-1" />
            My Progress
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Certificate */}
      <CertificateTemplate data={certificateData} />

      {/* Info */}
      <p className="text-sm text-muted-foreground text-center print:hidden">
        Use the print button above to save as PDF or print your certificate.
      </p>
    </div>
  )
}
