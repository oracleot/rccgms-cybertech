import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Printer, Trophy } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { BlurFade } from "@/components/ui/blur-fade"
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
    <div className="container max-w-4xl py-6 space-y-8">
      {/* Header */}
      <BlurFade delay={0.1} inView>
        <div className="flex items-center justify-between print:hidden">
          <Button variant="ghost" asChild className="-ml-4 group">
            <Link href="/training/my-progress">
              <ChevronLeft className="h-4 w-4 mr-1 transition-transform group-hover:-translate-x-1" />
              My Progress
            </Link>
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" className="group" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2 transition-transform group-hover:scale-110" />
              Print
            </Button>
          </div>
        </div>
      </BlurFade>

      {/* Achievement banner */}
      <BlurFade delay={0.15} inView>
        <div className="print:hidden relative overflow-hidden rounded-xl bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10 border border-green-200 dark:border-green-900/50 p-6 text-center">
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
          <div className="relative">
            <div className="inline-flex items-center justify-center p-3 rounded-full bg-green-100 dark:bg-green-900/30 mb-3">
              <Trophy className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-green-700 dark:text-green-400">Congratulations! 🎉</h2>
            <p className="text-muted-foreground mt-1">
              You&apos;ve successfully completed <span className="font-medium text-foreground">{certificateData.trackName}</span>
            </p>
          </div>
        </div>
      </BlurFade>

      {/* Certificate */}
      <BlurFade delay={0.25} inView>
        <CertificateTemplate data={certificateData} />
      </BlurFade>

      {/* Info */}
      <BlurFade delay={0.3} inView>
        <p className="text-sm text-muted-foreground text-center print:hidden">
          Use the print button above to save as PDF or print your certificate.
        </p>
      </BlurFade>
    </div>
  )
}
