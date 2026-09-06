"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CalendarPlus, Loader2, Users } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { SuggestedMeetingDate } from "@/types/meeting"

function formatDateLabel(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`)
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
}

export function AvailabilityOverview() {
  const [isLoading, setIsLoading] = useState(true)
  const [suggestions, setSuggestions] = useState<SuggestedMeetingDate[]>([])
  const [totalPeople, setTotalPeople] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        const supabase = createClient()
        const { data: profiles, error: profilesError } = await supabase.from("profiles").select("id")
        if (profilesError) throw profilesError

        const userIds = (profiles || []).map((p) => p.id)
        setTotalPeople(userIds.length)
        if (userIds.length === 0) {
          setSuggestions([])
          return
        }

        const params = new URLSearchParams({ userIds: userIds.join(","), days: "30" })
        const res = await fetch(`/api/rota/overlap?${params.toString()}`)
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || "Failed to load availability")
          return
        }
        setSuggestions(data.suggestions || [])
      } catch {
        setError("Failed to load availability")
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Best dates for the whole team</CardTitle>
        <CardDescription>
          Ranked by how many people have marked themselves available, over the next 30 days.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 py-8 justify-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading availability...
          </div>
        ) : error ? (
          <p className="py-8 text-center text-sm text-destructive">{error}</p>
        ) : suggestions.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nobody has submitted availability for the next 30 days yet.
          </p>
        ) : (
          <div className="space-y-2">
            {suggestions.map((s) => (
              <div
                key={s.date}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="space-y-1">
                  <p className="font-medium">{formatDateLabel(s.date)}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span>
                      {s.freeCount} of {totalPeople || s.totalConsidered} free
                    </span>
                    <Badge variant="secondary">{s.totalConsidered} responded</Badge>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/meetings/new?date=${s.date}`}>
                    <CalendarPlus className="mr-1.5 h-3.5 w-3.5" />
                    Book meeting
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
