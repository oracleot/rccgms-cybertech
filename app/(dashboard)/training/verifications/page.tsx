import { redirect } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, ClipboardCheck, Shield } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/empty-state"
import { BlurFade } from "@/components/ui/blur-fade"
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text"
import { VerifyActions } from "./verify-actions"
import type { VerificationRequest } from "@/types/training"

export const metadata = {
  title: "Verifications | Training",
  description: "Review and verify volunteer training completions",
}

export default async function VerificationsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login")
  }

  // Get user's profile and check role
  const { data: profileData } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single()

  const profile = profileData as { id: string; role: string } | null

  if (!profile || (profile.role !== "leader" && profile.role !== "lead_developer" && profile.role !== "admin")) {
    redirect("/training")
  }

  // Get pending verifications (completions for practical/shadowing steps without mentor verification)
  const { data: pendingCompletionsRaw } = await supabase
    .from("step_completions")
    .select(`
      id,
      volunteer_progress_id,
      step_id,
      completed_at,
      progress:volunteer_progress(
        id,
        user_id,
        track_id,
        user:profiles(id, name),
        track:onboarding_tracks(id, name)
      ),
      step:onboarding_steps(id, title, type)
    `)
    .is("mentor_verified_by", null)
    .order("completed_at", { ascending: true })

  interface CompletionRow {
    id: string
    volunteer_progress_id: string
    step_id: string
    completed_at: string
    progress: {
      id: string
      user_id: string
      track_id: string
      user: { id: string; name: string } | null
      track: { id: string; name: string } | null
    } | null
    step: { id: string; title: string; type: string } | null
  }

  const pendingCompletions = (pendingCompletionsRaw || []) as CompletionRow[]

  // Filter to only practical and shadowing steps
  const verificationRequests: VerificationRequest[] = pendingCompletions
    .filter(c => c.step?.type === "practical" || c.step?.type === "shadowing")
    .map(c => ({
      id: c.id,
      progressId: c.volunteer_progress_id,
      stepId: c.step_id,
      userId: c.progress?.user_id || "",
      userName: c.progress?.user?.name || "Unknown",
      trackName: c.progress?.track?.name || "Unknown Track",
      stepTitle: c.step?.title || "Unknown Step",
      stepType: (c.step?.type || "practical") as VerificationRequest["stepType"],
      completedAt: c.completed_at,
    }))

  return (
    <div className="container max-w-4xl py-6 space-y-8">
      {/* Header */}
      <BlurFade delay={0.1} inView>
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild className="-ml-4 group">
            <Link href="/training">
              <ChevronLeft className="h-4 w-4 mr-1 transition-transform group-hover:-translate-x-1" />
              Training
            </Link>
          </Button>
        </div>
      </BlurFade>

      <BlurFade delay={0.15} inView>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-500/10">
            <Shield className="h-7 w-7 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              <AnimatedGradientText 
                colorFrom="hsl(25, 95%, 53%)" 
                colorTo="hsl(38, 92%, 50%)"
                speed={2}
                className="text-3xl font-bold"
              >
                Pending Verifications
              </AnimatedGradientText>
            </h1>
            <p className="text-muted-foreground">
              Review and verify volunteer step completions
            </p>
          </div>
          {verificationRequests.length > 0 && (
            <div className="ml-auto px-3 py-1.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 text-sm font-medium">
              {verificationRequests.length} pending
            </div>
          )}
        </div>
      </BlurFade>

      {verificationRequests.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {verificationRequests.map((request, index) => (
            <BlurFade key={request.id} delay={0.2 + index * 0.05} inView>
              <VerifyActions request={request} />
            </BlurFade>
          ))}
        </div>
      ) : (
        <BlurFade delay={0.2} inView>
          <EmptyState
            icon={<ClipboardCheck className="h-12 w-12" />}
            title="No Pending Verifications"
            description="All volunteer step completions have been reviewed. Check back later for new requests."
          />
        </BlurFade>
      )}
    </div>
  )
}
