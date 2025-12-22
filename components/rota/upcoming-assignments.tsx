"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { Calendar, ChevronRight } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import type { AssignmentStatus } from "@/types/rota"

interface UpcomingAssignment {
  id: string
  status: AssignmentStatus
  date: string
  serviceName: string
  positionName: string
  departmentColor: string | null
}

interface UpcomingAssignmentsProps {
  userId?: string
  limit?: number
  showViewAll?: boolean
}

interface ProfileQueryResult {
  id: string
}

interface AssignmentQueryResult {
  id: string
  status: AssignmentStatus
  rota: {
    date: string
    status: string
    service: { name: string } | null
  } | null
  position: {
    name: string
    department: { color: string } | null
  } | null
}

export function UpcomingAssignments({
  userId,
  limit = 5,
  showViewAll = true,
}: UpcomingAssignmentsProps) {
  const [assignments, setAssignments] = useState<UpcomingAssignment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchAssignments() {
      setIsLoading(true)
      try {
        // Get current user if userId not provided
        let profileId = userId
        if (!profileId) {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) return

          const { data: profileData } = await supabase
            .from("profiles")
            .select("id")
            .eq("auth_user_id", user.id)
            .single()

          const profile = profileData as unknown as ProfileQueryResult | null
          if (!profile) return
          profileId = profile.id
        }

        const today = new Date().toISOString().split("T")[0]

        const { data, error } = await supabase
          .from("rota_assignments")
          .select(`
            id,
            status,
            rota:rotas(
              date,
              status,
              service:services(name)
            ),
            position:positions(
              name,
              department:departments(color)
            )
          `)
          .eq("user_id", profileId)
          .gte("rota.date", today)
          .eq("rota.status", "published")
          .order("rota(date)", { ascending: true })
          .limit(limit)

        if (error) throw error

        const assignmentsData = (data || []) as unknown as AssignmentQueryResult[]

        const items: UpcomingAssignment[] = assignmentsData
          .filter((a) => a.rota !== null)
          .map((a) => ({
            id: a.id,
            status: a.status,
            date: a.rota!.date,
            serviceName: a.rota!.service?.name || "Service",
            positionName: a.position?.name || "Position",
            departmentColor: a.position?.department?.color || null,
          }))

        setAssignments(items)
      } catch (error) {
        console.error("Error fetching assignments:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAssignments()
  }, [supabase, userId, limit])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upcoming Assignments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (assignments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upcoming Assignments</CardTitle>
          <CardDescription>Your scheduled duties</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center py-6 text-center">
            <Calendar className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No upcoming assignments
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Upcoming Assignments</CardTitle>
          <CardDescription>Your scheduled duties</CardDescription>
        </div>
        {showViewAll && (
          <Link
            href="/rota/my-schedule"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            View all
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {assignments.map((assignment) => (
          <div
            key={assignment.id}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
          >
            <div className="flex flex-col items-center justify-center w-12 h-12 bg-muted rounded-lg">
              <span className="text-xs text-muted-foreground">
                {format(new Date(assignment.date), "MMM")}
              </span>
              <span className="text-lg font-bold">
                {format(new Date(assignment.date), "d")}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: assignment.departmentColor || "#6b7280" }}
                />
                <span className="font-medium truncate">{assignment.positionName}</span>
              </div>
              <span className="text-sm text-muted-foreground truncate block">
                {assignment.serviceName}
              </span>
            </div>
            <Badge
              variant={assignment.status === "confirmed" ? "default" : "secondary"}
              className={
                assignment.status === "confirmed"
                  ? "bg-green-500 hover:bg-green-600"
                  : assignment.status === "declined"
                  ? "bg-red-500 hover:bg-red-600"
                  : ""
              }
            >
              {assignment.status}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
