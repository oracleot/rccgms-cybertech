"use client"

import Link from "next/link"
import { Clock, GraduationCap, Users } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ProgressIndicator } from "./progress-indicator"
import type { TrackWithDepartment, ProgressWithDetails } from "@/types/training"

interface TrackCardProps {
  track: TrackWithDepartment
  progress?: ProgressWithDetails | null
  enrollmentCount?: number
}

export function TrackCard({ track, progress, enrollmentCount }: TrackCardProps) {
  const isEnrolled = !!progress
  const percentComplete = progress?.percentComplete ?? 0
  const isCompleted = progress?.status === "completed"

  return (
    <Card className="flex flex-col h-full transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg">{track.name}</CardTitle>
            <CardDescription className="mt-1 line-clamp-2">
              {track.description || "No description available"}
            </CardDescription>
          </div>
          <Badge variant={isCompleted ? "default" : isEnrolled ? "secondary" : "outline"}>
            {isCompleted ? "Completed" : isEnrolled ? "In Progress" : "Available"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          {track.estimated_weeks && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{track.estimated_weeks} week{track.estimated_weeks !== 1 ? "s" : ""}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <GraduationCap className="h-4 w-4" />
            <span>{track.department?.name || "General"}</span>
          </div>
          {enrollmentCount !== undefined && (
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{enrollmentCount} enrolled</span>
            </div>
          )}
        </div>

        {isEnrolled && (
          <ProgressIndicator
            value={percentComplete}
            showLabel
            size="sm"
          />
        )}

        <div className="mt-auto pt-4">
          <Button asChild className="w-full" variant={isEnrolled ? "default" : "outline"}>
            <Link href={`/training/${track.id}`}>
              {isCompleted ? "View Certificate" : isEnrolled ? "Continue Learning" : "View Track"}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
