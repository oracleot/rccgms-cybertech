import { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Calendar,
  Clock,
  ExternalLink,
  Mail,
  Phone,
  User,
  Building2,
  LinkIcon,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Download,
  ImageIcon,
  Star,
  Timer,
  GitBranch,
} from "lucide-react"
import { format, formatDistanceToNow, isPast } from "date-fns"

import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { DesignStatusBadge } from "@/components/designs/design-status-badge"
import { DesignPriorityBadge } from "@/components/designs/design-priority-badge"
import { DesignDetailActions } from "./design-detail-actions"
import { cn } from "@/lib/utils"

interface DesignDetailPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({
  params,
}: DesignDetailPageProps): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()

  const { data: request } = await supabase
    .from("design_requests")
    .select("title")
    .eq("id", id)
    .single()

  return {
    title: request?.title
      ? `${request.title} | Design Requests | Cyber Tech`
      : "Design Request | Cyber Tech",
  }
}

export default async function DesignDetailPage({ params }: DesignDetailPageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Get current user profile
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    notFound()
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("auth_user_id", user.id)
    .single()

  // Fetch design request with assignee info
  const { data: request, error } = await supabase
    .from("design_requests")
    .select(`
      *,
      assignee:profiles!design_requests_assigned_to_fkey(id, name, email),
      assigned_by_user:profiles!design_requests_assigned_by_fkey(id, name)
    `)
    .eq("id", id)
    .single()

  if (error || !request) {
    notFound()
  }

  // Fetch all assignments from junction table
  const { data: assignments } = await supabase
    .from("design_request_assignments")
    .select(`
      id,
      profile_id,
      is_lead,
      assigned_at,
      profile:profiles!design_request_assignments_profile_id_fkey(id, name, email)
    `)
    .eq("request_id", id)
    .order("is_lead", { ascending: false })

  // Fetch sub-issues if this is a parent request
  const { data: subIssues } = await supabase
    .from("design_requests")
    .select(`
      id,
      title,
      status,
      priority,
      created_at,
      assignee:profiles!design_requests_assigned_to_fkey(id, name)
    `)
    .eq("parent_id", id)
    .order("created_at", { ascending: true })

  // Fetch parent if this is a sub-issue
  const parentRequest = request.parent_id
    ? (
        await supabase
          .from("design_requests")
          .select("id, title")
          .eq("id", request.parent_id)
          .single()
      ).data
    : null

  const isPastDeadline = request.needed_by && isPast(new Date(request.needed_by))
  const isPastInternalDeadline = request.deadline && isPast(new Date(request.deadline))
  const isAssignee = profile?.id === request.assigned_to
  const isAdminOrLeader = profile?.role === "admin" || profile?.role === "lead_developer" || profile?.role === "developer" || profile?.role === "leader"
  const currentUserRole = (profile?.role as "admin" | "lead_developer" | "developer" | "leader" | "member") || "member"

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/designs">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Designs
          </Link>
        </Button>
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column - Main details */}
        <div className="lg:col-span-2 space-y-6 min-w-0">
          {/* Title and badges */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <DesignStatusBadge status={request.status} />
                    <DesignPriorityBadge priority={request.priority} showIcon />
                    {request.request_type && (
                      <Badge variant="outline" className="capitalize">
                        {request.request_type.replace(/_/g, " ")}
                      </Badge>
                    )}
                    {request.is_archived && (
                      <Badge variant="secondary">Archived</Badge>
                    )}
                  </div>
                  <CardTitle className="text-2xl">{request.title}</CardTitle>
                  <CardDescription className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                    </span>
                    {request.needed_by && (
                      <span
                        className={cn(
                          "flex items-center gap-1",
                          isPastDeadline && "text-red-600 dark:text-red-400"
                        )}
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        Due: {format(new Date(request.needed_by), "MMM d, yyyy")}
                        {isPastDeadline && (
                          <AlertTriangle className="h-3.5 w-3.5 ml-1" />
                        )}
                      </span>
                    )}
                    {request.deadline && (
                      <span
                        className={cn(
                          "flex items-center gap-1",
                          isPastInternalDeadline && "text-red-600 dark:text-red-400"
                        )}
                      >
                        <Timer className="h-3.5 w-3.5" />
                        Deadline: {format(new Date(request.deadline), "MMM d, yyyy")}
                        {isPastInternalDeadline && (
                          <AlertTriangle className="h-3.5 w-3.5 ml-1" />
                        )}
                      </span>
                    )}
                    {parentRequest && (
                      <Link
                        href={`/designs/${parentRequest.id}`}
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <GitBranch className="h-3.5 w-3.5" />
                        Sub-issue of: {parentRequest.title}
                      </Link>
                    )}
                  </CardDescription>
                </div>

                {/* Actions */}
                <DesignDetailActions
                  requestId={request.id}
                  requestTitle={request.title}
                  currentStatus={request.status}
                  currentPriority={request.priority}
                  isAssigned={!!request.assigned_to}
                  isAssignee={isAssignee}
                  isAdminOrLeader={isAdminOrLeader}
                  currentUserRole={currentUserRole}
                  currentAssigneeId={request.assigned_to}
                  currentUserId={profile?.id || ""}
                  existingFiles={Array.isArray(request.deliverable_files) ? (request.deliverable_files as unknown as import("@/lib/validations/designs").DeliverableFile[]) : []}
                  currentAssignments={assignments?.map((a) => ({ profile_id: a.profile_id, is_lead: a.is_lead })) || []}
                  currentDeadline={request.deadline}
                  parentId={request.parent_id}
                />
              </div>
            </CardHeader>

            <Separator />

            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {request.description}
              </p>
            </CardContent>
          </Card>

          {/* Reference URLs */}
          {Array.isArray(request.reference_urls) && request.reference_urls.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  Reference Links
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(request.reference_urls as string[]).map((url: string, index: number) => (
                    <li key={index}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-2 text-sm"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        {url}
                      </a>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Deliverable Files (if any uploaded) */}
          {Array.isArray(request.deliverable_files) && request.deliverable_files.length > 0 && (
            <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-green-700 dark:text-green-300">
                  <CheckCircle2 className="h-5 w-5" />
                  Deliverable Files
                </CardTitle>
                <CardDescription className="text-green-600 dark:text-green-400">
                  {request.completed_at
                    ? `Completed ${format(new Date(request.completed_at), "MMM d, yyyy 'at' h:mm a")}`
                    : `${(request.deliverable_files as Array<{ name: string }>).length} file(s) uploaded`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(request.deliverable_files as Array<{ name: string; path: string; size: number }>).map((file, index) => {
                    const isImage = file.path.match(/\.(png|jpg|jpeg|webp)$/i)
                    const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/design-files/${file.path}`
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-3 rounded-md border border-green-200 bg-white p-3 dark:border-green-800 dark:bg-green-950/50"
                      >
                        <div className="h-12 w-12 rounded bg-green-100 dark:bg-green-900 flex items-center justify-center overflow-hidden shrink-0">
                          {isImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={publicUrl}
                              alt={file.name}
                              className="h-full w-full object-cover rounded"
                            />
                          ) : (
                            <ImageIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate text-green-800 dark:text-green-200">
                            {file.name}
                          </p>
                          <p className="text-xs text-green-600 dark:text-green-400">
                            {(file.size / 1024).toFixed(0)} KB
                          </p>
                        </div>
                        <a
                          href={publicUrl}
                          download={file.name}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Legacy Deliverable URL (if completed via old system) */}
          {request.deliverable_url && !Array.isArray(request.deliverable_files) && (
            <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-green-700 dark:text-green-300">
                  <CheckCircle2 className="h-5 w-5" />
                  Deliverable
                </CardTitle>
                <CardDescription className="text-green-600 dark:text-green-400">
                  {request.completed_at &&
                    `Completed ${format(new Date(request.completed_at), "MMM d, yyyy 'at' h:mm a")}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <a
                  href={request.deliverable_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-green-700 hover:text-green-800 dark:text-green-300 dark:hover:text-green-200 font-medium"
                >
                  <ExternalLink className="h-4 w-4" />
                  Download from Google Drive
                </a>
              </CardContent>
            </Card>
          )}

          {/* Revision Notes */}
          {request.revision_notes && (
            <Card className="border-orange-200 dark:border-orange-800">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-4 w-4 text-orange-600" />
                  Revision History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-sm whitespace-pre-wrap text-muted-foreground font-mono bg-muted/50 rounded-md p-4">
                  {request.revision_notes}
                </pre>
              </CardContent>
            </Card>
          )}

          {/* Internal Notes (Team Only) */}
          {request.internal_notes && (
            <Card className="border-blue-200 dark:border-blue-800">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  Internal Notes
                  <Badge variant="secondary" className="text-xs">Team Only</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-sm whitespace-pre-wrap break-all text-muted-foreground font-mono bg-muted/50 rounded-md p-4 overflow-hidden">
                  {request.internal_notes}
                </pre>
              </CardContent>
            </Card>
          )}

          {/* Sub-issues */}
          {subIssues && subIssues.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  Sub-issues ({subIssues.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {subIssues.map((sub) => (
                    <Link
                      key={sub.id}
                      href={`/designs/${sub.id}`}
                      className="flex items-center justify-between p-3 rounded-md border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <DesignStatusBadge status={sub.status} />
                        <span className="text-sm font-medium truncate">{sub.title}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <DesignPriorityBadge priority={sub.priority} />
                        {sub.assignee && (
                          <span className="text-xs text-muted-foreground">
                            {sub.assignee.name}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column - Sidebar */}
        <div className="space-y-6">
          {/* Assignment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Assignment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {assignments && assignments.length > 0 ? (
                <div className="space-y-3">
                  {assignments.map((assignment) => {
                    const assigneeProfile = assignment.profile as unknown as { id: string; name: string; email: string }
                    return (
                      <div key={assignment.id} className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                          {assigneeProfile?.name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">{assigneeProfile?.name}</p>
                            {assignment.is_lead && (
                              <Badge variant="default" className="text-[10px] h-4 px-1.5">
                                <Star className="h-2.5 w-2.5 mr-0.5 fill-current" />
                                Lead
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {assigneeProfile?.email}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                  {request.assigned_at && (
                    <p className="text-xs text-muted-foreground pt-1">
                      Assigned {formatDistanceToNow(new Date(request.assigned_at), { addSuffix: true })}
                      {request.assigned_by_user && ` by ${request.assigned_by_user.name}`}
                    </p>
                  )}
                </div>
              ) : request.assignee ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                      {request.assignee.name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="font-medium">{request.assignee.name}</p>
                      <p className="text-sm text-muted-foreground">{request.assignee.email}</p>
                    </div>
                  </div>
                  {request.assigned_at && (
                    <p className="text-xs text-muted-foreground">
                      Assigned {formatDistanceToNow(new Date(request.assigned_at), { addSuffix: true })}
                      {request.assigned_by_user && ` by ${request.assigned_by_user.name}`}
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <User className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
                    Unclaimed
                  </p>
                  <p className="text-xs text-muted-foreground">
                    This request is waiting to be claimed
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Deadline */}
          {request.deadline && (
            <Card className={cn(isPastInternalDeadline && "border-red-300 dark:border-red-800")}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Timer className="h-4 w-4" />
                  Deadline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={cn(
                  "font-medium",
                  isPastInternalDeadline && "text-red-600 dark:text-red-400"
                )}>
                  {format(new Date(request.deadline), "MMM d, yyyy 'at' h:mm a")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isPastInternalDeadline
                    ? `Overdue by ${formatDistanceToNow(new Date(request.deadline))}`
                    : `${formatDistanceToNow(new Date(request.deadline))} remaining`}
                </p>
                {request.delay_reason && (
                  <div className="mt-3 p-2 rounded bg-amber-50 dark:bg-amber-950 text-xs text-amber-800 dark:text-amber-200">
                    <span className="font-medium">Delay reason:</span> {request.delay_reason}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Requester Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Requester</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{request.requester_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`mailto:${request.requester_email}`}
                  className="text-primary hover:underline text-sm"
                >
                  {request.requester_email}
                </a>
              </div>
              {request.requester_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`tel:${request.requester_phone}`}
                    className="text-primary hover:underline text-sm"
                  >
                    {request.requester_phone}
                  </a>
                </div>
              )}
              {request.requester_ministry && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{request.requester_ministry}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{format(new Date(request.created_at), "MMM d, yyyy")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span>{format(new Date(request.updated_at), "MMM d, yyyy")}</span>
              </div>
              {request.needed_by && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Due</span>
                  <span
                    className={cn(
                      isPastDeadline && "text-red-600 dark:text-red-400 font-medium"
                    )}
                  >
                    {format(new Date(request.needed_by), "MMM d, yyyy")}
                  </span>
                </div>
              )}
              {request.deadline && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deadline</span>
                  <span
                    className={cn(
                      isPastInternalDeadline && "text-red-600 dark:text-red-400 font-medium"
                    )}
                  >
                    {format(new Date(request.deadline), "MMM d, yyyy")}
                  </span>
                </div>
              )}
              {request.completed_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completed</span>
                  <span className="text-green-600 dark:text-green-400">
                    {format(new Date(request.completed_at), "MMM d, yyyy")}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
