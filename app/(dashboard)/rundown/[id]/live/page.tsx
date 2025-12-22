import { notFound } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { ArrowLeft, ListVideo } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LiveView } from "@/components/rundown/live-view"
import type { RundownEditorItem } from "@/components/rundown/types"
import type { RundownItemType } from "@/types/rundown"

interface RundownLivePageProps {
  params: Promise<{ id: string }>
}

export default async function RundownLivePage({ params }: RundownLivePageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("rundowns")
    .select(
      `id, title, date,
       service:services(id, name),
       items:rundown_items(id, order, type, title, duration_seconds, notes)
      `
    )
    .eq("id", id)
    .single()

  if (error || !data) {
    notFound()
  }

  const rundown = data as {
    id: string
    title: string
    date: string
    service: { id: string; name: string | null } | null
    items: Array<{
      id: string
      order: number
      type: RundownItemType
      title: string
      duration_seconds: number | null
      notes: string | null
    }>
  }

  const items: RundownEditorItem[] = (rundown.items || []).map((item) => ({
    id: item.id,
    order: item.order || 0,
    type: item.type,
    title: item.title,
    durationSeconds: item.duration_seconds || 0,
    notes: item.notes,
  }))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/rundown">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <ListVideo className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold">Live view</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            {rundown.title} • {format(new Date(rundown.date), "PPP")}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Service</CardTitle>
          <CardDescription>{rundown.service?.name || "Service"}</CardDescription>
        </CardHeader>
        <CardContent>
          <LiveView items={items} serviceName={rundown.service?.name || null} />
        </CardContent>
      </Card>
    </div>
  )
}
