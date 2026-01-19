"use client"

import Link from "next/link"
import { Clock, GraduationCap, Users, Sparkles, ArrowRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BorderBeam } from "@/components/ui/border-beam"
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
    <Card className="group relative flex flex-col h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1">
      {/* Border beam for enrolled/completed tracks */}
      {isEnrolled && (
        <BorderBeam 
          size={200} 
          duration={8} 
          colorFrom={isCompleted ? "hsl(142, 76%, 36%)" : "hsl(var(--primary))"} 
          colorTo={isCompleted ? "hsl(142, 76%, 56%)" : "hsl(var(--primary) / 0.5)"} 
        />
      )}
      
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      
      <CardHeader className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-1">
            <CardTitle className="text-lg group-hover:text-primary transition-colors">
              {track.name}
            </CardTitle>
            <CardDescription className="line-clamp-2">
              {track.description || "No description available"}
            </CardDescription>
          </div>
          <Badge 
            variant={isCompleted ? "default" : isEnrolled ? "secondary" : "outline"}
            className={`
              shrink-0 transition-all duration-300
              ${isCompleted ? "bg-green-600 hover:bg-green-700" : ""}
              ${isEnrolled && !isCompleted ? "animate-pulse" : ""}
            `}
          >
            {isCompleted && <Sparkles className="h-3 w-3 mr-1" />}
            {isCompleted ? "Completed" : isEnrolled ? "In Progress" : "Available"}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="relative flex-1 flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {track.estimated_weeks && (
            <div className="flex items-center gap-1.5 bg-muted/50 rounded-full px-2.5 py-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{track.estimated_weeks} week{track.estimated_weeks !== 1 ? "s" : ""}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 bg-muted/50 rounded-full px-2.5 py-1">
            <GraduationCap className="h-3.5 w-3.5" />
            <span>{track.department?.name || "General"}</span>
          </div>
          {enrollmentCount !== undefined && enrollmentCount > 0 && (
            <div className="flex items-center gap-1.5 bg-muted/50 rounded-full px-2.5 py-1">
              <Users className="h-3.5 w-3.5" />
              <span>{enrollmentCount}</span>
            </div>
          )}
        </div>

        {isEnrolled && (
          <div className="space-y-1">
            <ProgressIndicator
              value={percentComplete}
              showLabel
              size="sm"
              animated
            />
          </div>
        )}

        <div className="mt-auto pt-4">
          <Button 
            asChild 
            className={`
              w-full group/btn transition-all duration-300
              ${isCompleted ? "bg-green-600 hover:bg-green-700" : ""}
            `}
            variant={isEnrolled ? "default" : "outline"}
          >
            <Link href={`/training/${track.id}`}>
              <span>{isCompleted ? "View Certificate" : isEnrolled ? "Continue Learning" : "View Track"}</span>
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
