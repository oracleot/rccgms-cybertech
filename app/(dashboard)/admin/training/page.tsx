import { redirect } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Plus, GraduationCap, BookPlus, CheckCircle2, XCircle, Clock } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/shared/empty-state"
import { Separator } from "@/components/ui/separator"
import { CourseRequestActions } from "./_components/course-request-actions"

export const metadata = {
  title: "Manage Training | Admin",
  description: "Manage training tracks and steps",
}

export default async function AdminTrainingPage() {
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

  // Only allow roles that can manage training; others see read-only training view
  if (!profile || !["admin", "lead_developer", "developer", "leader"].includes(profile.role)) {
    redirect("/training")
  }

  // Get all tracks with step counts
  const { data: tracksData } = await supabase
    .from("onboarding_tracks")
    .select(`
      *,
      department:departments(id, name),
      steps:onboarding_steps(count),
      enrollments:member_progress(count)
    `)
    .order("name", { ascending: true })

  interface TrackRow {
    id: string
    name: string
    description: string | null
    is_active: boolean
    estimated_weeks: number | null
    department: { id: string; name: string } | null
    steps: { count: number }[] | { count: number }
    enrollments: { count: number }[] | { count: number }
  }

  const tracks = (tracksData || []) as TrackRow[]

  // Get departments for the create form
  const { data: _departments } = await supabase
    .from("departments")
    .select("id, name")
    .order("name")

  // Fetch pending course requests
  const { data: courseRequestsRaw } = await supabase
    .from("course_requests")
    .select(`
      id, title, description, reason, status, created_at,
      requester:profiles!course_requests_requested_by_fkey(id, name, role)
    `)
    .order("created_at", { ascending: false })
    .limit(20)

  interface CourseRequestRow {
    id: string
    title: string
    description: string | null
    reason: string | null
    status: string
    created_at: string
    requester: { id: string; name: string; role: string } | null
  }

  const courseRequests = (courseRequestsRaw || []) as CourseRequestRow[]
  const pendingRequests = courseRequests.filter((r) => r.status === "pending")

  return (
    <div className="container max-w-6xl py-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" asChild className="-ml-4">
          <Link href="/admin">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Admin
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Training Management</h1>
          <p className="text-muted-foreground">
            Create and manage training tracks for members
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/training/new">
            <Plus className="h-4 w-4 mr-2" />
            New Track
          </Link>
        </Button>
      </div>

      {/* Tracks list */}
      {tracks && tracks.length > 0 ? (
        <div className="grid gap-4">
          {tracks.map((track) => {
            const stepCount = Array.isArray(track.steps) ? track.steps.length : 
              (track.steps as { count: number })?.count ?? 0
            const enrollmentCount = Array.isArray(track.enrollments) ? track.enrollments.length :
              (track.enrollments as { count: number })?.count ?? 0

            return (
              <Card key={track.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {track.name}
                        {!track.is_active && (
                          <Badge variant="outline" className="font-normal">Draft</Badge>
                        )}
                      </CardTitle>
                      <CardDescription>{track.description || "No description"}</CardDescription>
                    </div>
                    <Badge variant="secondary">
                      {track.department?.name || "General"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-6 text-sm text-muted-foreground">
                      <span>{stepCount} steps</span>
                      <span>{enrollmentCount} enrolled</span>
                      {track.estimated_weeks && (
                        <span>{track.estimated_weeks} weeks</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/training/${track.id}`}>
                          Edit Track
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/training/${track.id}`}>
                          Preview
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <EmptyState
          icon={<GraduationCap className="h-12 w-12" />}
          title="No Training Tracks"
          description="Create your first training track to help members learn and grow."
          action={
            <Button asChild>
              <Link href="/admin/training/new">
                <Plus className="h-4 w-4 mr-2" />
                Create Track
              </Link>
            </Button>
          }
        />
      )}

      {/* Course Requests Section */}
      <Separator />
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <BookPlus className="h-5 w-5 text-primary" />
              Course Requests
              {pendingRequests.length > 0 && (
                <Badge variant="destructive" className="ml-1">{pendingRequests.length} pending</Badge>
              )}
            </h2>
            <p className="text-sm text-muted-foreground">Member requests for new training courses</p>
          </div>
        </div>

        {courseRequests.length > 0 ? (
          <div className="grid gap-3">
            {courseRequests.map((req) => (
              <Card key={req.id} className={req.status === "pending" ? "border-amber-200 dark:border-amber-800" : ""}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{req.title}</p>
                        <Badge
                          variant={req.status === "pending" ? "outline" : req.status === "approved" ? "default" : "destructive"}
                          className="capitalize"
                        >
                          {req.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                          {req.status === "approved" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {req.status === "rejected" && <XCircle className="h-3 w-3 mr-1" />}
                          {req.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Requested by <span className="font-medium">{req.requester?.name ?? "Unknown"}</span>
                        {" · "}
                        {new Date(req.created_at).toLocaleDateString()}
                      </p>
                      {req.description && (
                        <p className="text-sm mt-1">{req.description}</p>
                      )}
                      {req.reason && (
                        <p className="text-xs text-muted-foreground mt-1 italic">&quot;{req.reason}&quot;</p>
                      )}
                    </div>
                    {req.status === "pending" && (
                      <CourseRequestActions requestId={req.id} />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground text-sm">
            No course requests yet. Members can request courses from the Training page.
          </div>
        )}
      </div>
    </div>
  )
}
