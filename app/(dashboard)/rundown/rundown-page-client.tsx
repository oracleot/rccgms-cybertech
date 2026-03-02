"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { ListOrdered, Plus, RefreshCw } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { useUser } from "@/hooks/use-user"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { RundownCard } from "@/components/rundown/rundown-card"
import type { RundownStatus } from "@/types/rundown"

interface RundownListResult {
  id: string
  title: string
  date: string
  status: RundownStatus
  service: { id: string; name: string | null } | null
  items: Array<{ duration_seconds: number | null }>
  created_by_user: { name: string | null } | null
}

export function RundownPageClient() {
  const { user } = useUser()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(true)
  const [rundowns, setRundowns] = useState<RundownListResult[]>([])

  const canCreate = user?.role === "admin" || user?.role === "lead_developer" || user?.role === "developer" || user?.role === "leader"

  const fetchRundowns = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("rundowns")
        .select(
          `id, title, date, status,
           service:services(id, name),
           items:rundown_items(duration_seconds),
           created_by_user:profiles!created_by(name)
          `
        )
        .order("date", { ascending: false })
        .limit(20)

      if (error) throw error
      setRundowns((data || []) as RundownListResult[])
    } catch (error) {
      console.error("Error loading rundowns", error)
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchRundowns()
  }, [fetchRundowns])

  const emptyState = (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-10 text-center">
        <ListOrdered className="mb-3 h-10 w-10 text-muted-foreground" />
        <h3 className="text-lg font-semibold">No rundowns yet</h3>
        <p className="text-sm text-muted-foreground">
          Create your first rundown to plan the service flow.
        </p>
        {canCreate && (
          <Button className="mt-4" asChild>
            <Link href="/rundown/new">New rundown</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rundowns</h1>
          <p className="text-muted-foreground">Plan service flow, timing, and cues.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchRundowns}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          {canCreate && (
            <Button asChild>
              <Link href="/rundown/new">
                <Plus className="mr-2 h-4 w-4" />
                New rundown
              </Link>
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((key) => (
            <Card key={key} className="p-4">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="mt-2 h-4 w-24" />
              <Skeleton className="mt-4 h-4 w-32" />
            </Card>
          ))}
        </div>
      ) : rundowns.length === 0 ? (
        emptyState
      ) : (
        <div className={cn("grid gap-4", rundowns.length > 1 ? "md:grid-cols-2" : "")}>
          {rundowns.map((rundown) => {
            const totalDuration = rundown.items.reduce(
              (total, item) => total + (item.duration_seconds || 0),
              0
            )

            return (
              <RundownCard
                key={rundown.id}
                id={rundown.id}
                title={rundown.title}
                date={format(new Date(rundown.date), "yyyy-MM-dd")}
                status={rundown.status}
                serviceName={rundown.service?.name || null}
                itemCount={rundown.items.length}
                totalDuration={totalDuration}
                createdBy={rundown.created_by_user?.name || null}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
