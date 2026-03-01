import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { ArrowLeft, CalendarDays, Eye } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RundownEditor } from "@/components/rundown/rundown-editor"
import { RundownStatusControls } from "@/components/rundown/rundown-status-controls"
import type { RundownEditorItem } from "@/components/rundown/types"
import type { RundownItemType, RundownStatus } from "@/types/rundown"

interface RundownPageProps {
  params: Promise<{ id: string }>
}

interface RundownQueryResult {
  id: string
  title: string
  date: string
  status: RundownStatus
  service: { id: string; name: string | null; start_time: string | null; end_time: string | null } | null
  items: Array<{
    id: string
    order: number
    type: RundownItemType
    title: string
    duration_seconds: number | null
    notes: string | null
    assigned_user: { id: string; name: string; avatar_url: string | null } | null
  }>
}

export default async function RundownDetailPage({ params }: RundownPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let role = "member"
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("auth_user_id", user.id)
      .single()

    if (profile) {
      role = (profile as { role: string }).role
    }
  }

  const { data, error } = await supabase
    .from("rundowns")
    .select(
      `id, title, date, status,
       service:services(id, name, start_time, end_time),
       items:rundown_items(
         id,
         order,
         type,
         title,
         duration_seconds,
         notes,
         assigned_user:profiles!rundown_items_assigned_to_fkey(id, name, avatar_url)
       )
      `
    )
    .eq("id", id)
    .single()

  if (error || !data) {
    notFound()
  }

  const rundown = data as unknown as RundownQueryResult
  const items: RundownEditorItem[] = (rundown.items || []).map((item) => ({
    id: item.id,
    order: item.order || 0,
    type: item.type,
    title: item.title,
    durationSeconds: item.duration_seconds || 0,
    notes: item.notes,
    assignedTo: item.assigned_user
      ? {
          id: item.assigned_user.id,
          name: item.assigned_user.name,
          avatarUrl: item.assigned_user.avatar_url,
        }
      : null,
  }))

  const canEdit = role === "admin" || role === "developer" || role === "leader"

  if (!canEdit) {
    redirect(`/rundown/${id}/live`)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/rundown">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{rundown.title}</h1>
            </div>
            <p className="text-muted-foreground text-sm flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {format(new Date(rundown.date), "PPP")}
              {rundown.service?.name && <span className="text-xs">• {rundown.service.name}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/rundown/${id}/live`}>
              <Eye className="mr-2 h-4 w-4" />
              Live view
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Rundown details</CardTitle>
          <CardDescription>
            {rundown.service?.name || "Service"}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1 text-sm">
            <p className="text-muted-foreground">Date</p>
            <p className="font-medium">{format(new Date(rundown.date), "EEEE, MMM d")}</p>
          </div>
          <div className="space-y-1 text-sm">
            <p className="text-muted-foreground">Status</p>
            <p className="font-medium capitalize">{rundown.status}</p>
          </div>
          {canEdit && (
            <div className="sm:col-span-2 space-y-2">
              <p className="text-sm text-muted-foreground">Change status</p>
              <RundownStatusControls rundownId={rundown.id} status={rundown.status} />
            </div>
          )}
        </CardContent>
      </Card>

      <RundownEditor rundownId={rundown.id} initialItems={items} canEdit={canEdit} />
    </div>
  )
}
