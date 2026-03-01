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

  const isPastDeadline = request.needed_by && isPast(new Date(request.needed_by))
  const isAssignee = profile?.id === request.assigned_to
  const isAdminOrLeader = profile?.role === "admin" || profile?.role === "leader"
  const currentUserRole = (profile?.role as "admin" | "leader" | "member") || "member"

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
        <div className="lg:col-span-2 space-y-6">
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

          {/* Deliverable URL (if completed) */}
          {request.deliverable_url && (
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
                <pre className="text-sm whitespace-pre-wrap text-muted-foreground font-mono bg-muted/50 rounded-md p-4">
                  {request.internal_notes}
                </pre>
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
              {request.assignee ? (
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
