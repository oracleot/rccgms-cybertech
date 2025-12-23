import { redirect } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, ClipboardCheck } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/shared/empty-state"
import { VerificationCard } from "@/components/training/verification-card"
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

  if (!profile || (profile.role !== "leader" && profile.role !== "admin")) {
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
      <div className="flex items-center gap-4">
        <Button variant="ghost" asChild className="-ml-4">
          <Link href="/training">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Training
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pending Verifications</h1>
        <p className="text-muted-foreground">
          Review and verify volunteer step completions
        </p>
      </div>

      {verificationRequests.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {verificationRequests.map((request) => (
            <VerifyActions key={request.id} request={request} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<ClipboardCheck className="h-12 w-12" />}
          title="No Pending Verifications"
          description="All volunteer step completions have been reviewed. Check back later for new requests."
        />
      )}
    </div>
  )
}
