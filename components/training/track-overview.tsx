"use client"

import { Clock, FileText, GraduationCap, Users } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ProgressIndicator } from "./progress-indicator"
import type { TrackWithDetails, ProgressWithDetails } from "@/types/training"

interface TrackOverviewProps {
  track: TrackWithDetails
  progress?: ProgressWithDetails | null
  onEnroll?: () => void
  isEnrolling?: boolean
}

export function TrackOverview({ 
  track, 
  progress, 
  onEnroll,
  isEnrolling = false 
}: TrackOverviewProps) {
  const isEnrolled = !!progress
  const isCompleted = progress?.status === "completed"
  const percentComplete = progress?.percentComplete ?? 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-2xl">{track.name}</CardTitle>
            <CardDescription className="mt-2 text-base">
              {track.description || "No description available"}
            </CardDescription>
          </div>
          <Badge 
            variant={isCompleted ? "default" : isEnrolled ? "secondary" : "outline"}
            className="text-sm"
          >
            {isCompleted ? "Completed" : isEnrolled ? "In Progress" : "Not Enrolled"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span className="text-sm">Steps</span>
            </div>
            <span className="text-2xl font-semibold">{track.totalSteps}</span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Duration</span>
            </div>
            <span className="text-2xl font-semibold">
              {track.estimated_weeks ? `${track.estimated_weeks}w` : "—"}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <GraduationCap className="h-4 w-4" />
              <span className="text-sm">Department</span>
            </div>
            <span className="text-lg font-medium truncate">
              {track.department?.name || "General"}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="text-sm">Required</span>
            </div>
            <span className="text-2xl font-semibold">{track.requiredSteps}</span>
          </div>
        </div>

        {isEnrolled && (
          <div className="pt-2">
            <ProgressIndicator
              value={percentComplete}
              showLabel
              size="lg"
            />
            {progress && (
              <p className="text-sm text-muted-foreground mt-2">
                {progress.completedSteps} of {progress.totalSteps} steps completed
              </p>
            )}
          </div>
        )}

        {!isEnrolled && onEnroll && (
          <Button 
            onClick={onEnroll} 
            disabled={isEnrolling}
            size="lg"
            className="w-full sm:w-auto"
          >
            {isEnrolling ? "Enrolling..." : "Enroll in This Track"}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
