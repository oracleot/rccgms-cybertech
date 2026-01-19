"use client"

import { Clock, FileText, GraduationCap, Users, Sparkles, Target, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShimmerButton } from "@/components/ui/shimmer-button"
import { BorderBeam } from "@/components/ui/border-beam"
import { NumberTicker } from "@/components/ui/number-ticker"
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
    <Card className="relative overflow-hidden">
      {/* Animated border for enrolled tracks */}
      {isEnrolled && (
        <BorderBeam 
          size={250} 
          duration={8} 
          colorFrom={isCompleted ? "hsl(142, 76%, 36%)" : "hsl(var(--primary))"} 
          colorTo={isCompleted ? "hsl(142, 76%, 56%)" : "hsl(var(--primary) / 0.5)"} 
        />
      )}
      
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
      
      <CardHeader className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${isCompleted ? "bg-green-500/10" : "bg-primary/10"}`}>
                <GraduationCap className={`h-6 w-6 ${isCompleted ? "text-green-600 dark:text-green-400" : "text-primary"}`} />
              </div>
              <CardTitle className="text-2xl">{track.name}</CardTitle>
            </div>
            <CardDescription className="text-base max-w-2xl">
              {track.description || "No description available"}
            </CardDescription>
          </div>
          <Badge 
            variant={isCompleted ? "default" : isEnrolled ? "secondary" : "outline"}
            className={`
              text-sm px-3 py-1 shrink-0
              ${isCompleted ? "bg-green-600 hover:bg-green-700" : ""}
            `}
          >
            {isCompleted && <Sparkles className="h-3.5 w-3.5 mr-1" />}
            {isCompleted ? "Completed" : isEnrolled ? "In Progress" : "Not Enrolled"}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="relative space-y-6">
        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="group flex flex-col gap-1.5 p-4 rounded-xl bg-muted/50 hover:bg-muted/70 transition-colors">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span className="text-sm">Steps</span>
            </div>
            <span className="text-2xl font-bold">
              <NumberTicker value={track.totalSteps} />
            </span>
          </div>
          <div className="group flex flex-col gap-1.5 p-4 rounded-xl bg-muted/50 hover:bg-muted/70 transition-colors">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Duration</span>
            </div>
            <span className="text-2xl font-bold">
              {track.estimated_weeks ? (
                <>
                  <NumberTicker value={track.estimated_weeks} />
                  <span className="text-lg font-normal text-muted-foreground ml-1">weeks</span>
                </>
              ) : "—"}
            </span>
          </div>
          <div className="group flex flex-col gap-1.5 p-4 rounded-xl bg-muted/50 hover:bg-muted/70 transition-colors">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="text-sm">Department</span>
            </div>
            <span className="text-lg font-semibold truncate">
              {track.department?.name || "General"}
            </span>
          </div>
          <div className="group flex flex-col gap-1.5 p-4 rounded-xl bg-muted/50 hover:bg-muted/70 transition-colors">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Target className="h-4 w-4" />
              <span className="text-sm">Required</span>
            </div>
            <span className="text-2xl font-bold">
              <NumberTicker value={track.requiredSteps} />
            </span>
          </div>
        </div>

        {/* Progress section for enrolled users */}
        {isEnrolled && (
          <div className="p-5 rounded-xl bg-gradient-to-r from-muted/50 to-muted/30 border">
            <div className="flex items-center gap-2 mb-3">
              {isCompleted ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <div className="relative">
                  <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                </div>
              )}
              <span className="font-medium">
                {isCompleted ? "Training Complete!" : "Your Progress"}
              </span>
            </div>
            <ProgressIndicator
              value={percentComplete}
              showLabel
              size="lg"
              animated
            />
            {progress && (
              <p className="text-sm text-muted-foreground mt-3">
                <span className="font-semibold text-foreground">{progress.completedSteps}</span> of {progress.totalSteps} steps completed
                {progress.completedSteps > 0 && !isCompleted && (
                  <span className="ml-2 text-primary">• Keep going!</span>
                )}
              </p>
            )}
          </div>
        )}

        {/* Enrollment button */}
        {!isEnrolled && onEnroll && (
          <div className="pt-2">
            <ShimmerButton 
              onClick={onEnroll} 
              disabled={isEnrolling}
              className="w-full sm:w-auto text-base px-8 py-4"
              shimmerColor="hsl(var(--primary))"
              background="hsl(var(--primary))"
            >
              {isEnrolling ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-2" />
                  Enrolling...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Enroll in This Track
                </>
              )}
            </ShimmerButton>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
