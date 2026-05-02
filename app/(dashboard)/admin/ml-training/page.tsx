import { Metadata } from "next"
import { Brain, CheckCircle2, Clock, XCircle, TrendingUp } from "lucide-react"
import { requireDeveloperOnly } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"
import { AdminBreadcrumb } from "@/components/admin/admin-breadcrumb"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MLTrainingClient } from "./_components/ml-training-client"

export const metadata: Metadata = {
  title: "ML Training | Dev Tools | Fusion",
  description: "Review and approve AI feedback to improve caption and description generation",
}

interface FeedbackRow {
  id: string
  feedback_type: string
  platform: string | null
  context_used: string | null
  original_output: string
  corrected_output: string | null
  rating: number | null
  is_approved: boolean | null
  approved_at: string | null
  created_at: string
  user: { name: string } | null
}

export default async function MLTrainingPage() {
  await requireDeveloperOnly()
  const supabase = await createClient()

  const { data: feedbackRaw } = await supabase
    .from("ai_feedback")
    .select(`
      id,
      feedback_type,
      platform,
      context_used,
      original_output,
      corrected_output,
      rating,
      is_approved,
      approved_at,
      created_at,
      user:profiles!ai_feedback_user_id_fkey(name)
    `)
    .order("created_at", { ascending: false })
    .limit(200)

  const feedback = (feedbackRaw || []) as FeedbackRow[]

  const stats = {
    total: feedback.length,
    pending: feedback.filter((f) => f.is_approved === null).length,
    approved: feedback.filter((f) => f.is_approved === true).length,
    rejected: feedback.filter((f) => f.is_approved === false).length,
    withCorrection: feedback.filter((f) => f.corrected_output).length,
    avgRating:
      feedback.filter((f) => f.rating).length > 0
        ? (
            feedback.filter((f) => f.rating).reduce((sum, f) => sum + (f.rating ?? 0), 0) /
            feedback.filter((f) => f.rating).length
          ).toFixed(1)
        : null,
  }

  return (
    <div className="space-y-6">
      <AdminBreadcrumb items={[{ label: "Dev Tools", href: "/admin/developer" }, { label: "ML Training" }]} />

      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Brain className="h-6 w-6 text-primary" />
          ML Training Dashboard
        </h1>
        <p className="text-muted-foreground">
          Review user feedback on AI-generated captions and descriptions. Approved entries are used as few-shot examples in future generations.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Approved for Training
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Rejected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{stats.rejected}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Avg Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {stats.avgRating ? `${stats.avgRating}/5` : "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      <MLTrainingClient feedback={feedback} />
    </div>
  )
}
