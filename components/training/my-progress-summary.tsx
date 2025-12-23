"use client"

import Link from "next/link"
import { Clock, GraduationCap, ChevronRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ProgressIndicator } from "./progress-indicator"
import type { ProgressWithDetails } from "@/types/training"

interface MyProgressSummaryProps {
  activeEnrollments: ProgressWithDetails[]
  completedTracks: ProgressWithDetails[]
}

export function MyProgressSummary({ activeEnrollments, completedTracks }: MyProgressSummaryProps) {
  const totalCompleted = completedTracks.length
  const totalActive = activeEnrollments.length

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalActive}</div>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalCompleted}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {activeEnrollments.reduce((acc, p) => acc + p.completedSteps, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Steps Done</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {totalCompleted > 0 ? "🏆" : "—"}
            </div>
            <p className="text-xs text-muted-foreground">Certificates</p>
          </CardContent>
        </Card>
      </div>

      {/* Active enrollments */}
      {activeEnrollments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Continue Learning</CardTitle>
            <CardDescription>Pick up where you left off</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeEnrollments.map((progress) => (
              <Link
                key={progress.id}
                href={`/training/${progress.track_id}`}
                className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{progress.track.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {progress.track.department?.name || "General"}
                    </Badge>
                  </div>
                  <div className="mt-2">
                    <ProgressIndicator value={progress.percentComplete} size="sm" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {progress.completedSteps} of {progress.totalSteps} steps completed
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Completed tracks */}
      {completedTracks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Completed Tracks</CardTitle>
            <CardDescription>Your training achievements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {completedTracks.map((progress) => (
              <div
                key={progress.id}
                className="flex items-center gap-4 p-4 rounded-lg border bg-muted/30"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    <span className="font-medium truncate">{progress.track.name}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span>{progress.track.department?.name || "General"}</span>
                    {progress.completed_at && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Completed {new Date(progress.completed_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/training/certificates/${progress.id}`}>
                    View Certificate
                  </Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {activeEnrollments.length === 0 && completedTracks.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <GraduationCap className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium text-lg">No Training Progress Yet</h3>
            <p className="text-muted-foreground mt-1 max-w-md">
              Browse available training tracks and enroll to start building your skills.
            </p>
            <Button asChild className="mt-4">
              <Link href="/training">Browse Training Tracks</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
