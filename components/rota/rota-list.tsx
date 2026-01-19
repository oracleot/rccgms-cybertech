"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { ChevronRight, Users } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { RotaStatusBadge } from "@/components/rota/rota-status-badge"
import type { RotaStatus } from "@/types/rota"

interface RotaListItem {
  id: string
  date: string
  status: RotaStatus
  service: {
    id: string
    name: string
    start_time: string | null
    location: string | null
  } | null
  assignments: Array<{ id: string }>
}

export function RotaList() {
  const [rotas, setRotas] = useState<RotaListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  const fetchRotas = useCallback(async () => {
    setIsLoading(true)
    try {
      const today = new Date().toISOString().split("T")[0]
      
      const { data, error } = await supabase
        .from("rotas")
        .select(`
          id,
          date,
          status,
          service:services(id, name, start_time, location),
          assignments:rota_assignments(id)
        `)
        .gte("date", today)
        .order("date", { ascending: true })
        .limit(20)

      if (error) throw error
      setRotas(data || [])
    } catch (error) {
      console.error("Error fetching rotas:", error)
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchRotas()
  }, [fetchRotas])

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (rotas.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No upcoming rotas</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Create a new rota to get started
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {rotas.map((rota) => (
        <Link key={rota.id} href={`/rota/${rota.id}`}>
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {rota.service?.name || "Service"}
                  </CardTitle>
                  <CardDescription>
                    {format(new Date(rota.date), "EEEE, MMMM d, yyyy")}
                    {rota.service?.start_time && (
                      <> at {rota.service.start_time.slice(0, 5)}</>
                    )}
                  </CardDescription>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-4">
                <RotaStatusBadge status={rota.status} />
                <span className="text-sm text-muted-foreground">
                  {rota.assignments.length} volunteers assigned
                </span>
                {rota.service?.location && (
                  <span className="text-sm text-muted-foreground">
                    @ {rota.service.location}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
