"use client"

import Link from "next/link"
import { Clock, GraduationCap, ChevronRight, Trophy, BookOpen, Target, Flame } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BorderBeam } from "@/components/ui/border-beam"
import { NumberTicker } from "@/components/ui/number-ticker"
import { ProgressIndicator } from "./progress-indicator"
import type { ProgressWithDetails } from "@/types/training"

interface MyProgressSummaryProps {
  activeEnrollments: ProgressWithDetails[]
  completedTracks: ProgressWithDetails[]
}

export function MyProgressSummary({ activeEnrollments, completedTracks }: MyProgressSummaryProps) {
  const totalCompleted = completedTracks.length
  const totalActive = activeEnrollments.length
  const totalStepsDone = activeEnrollments.reduce((acc, p) => acc + p.completedSteps, 0) + 
    completedTracks.reduce((acc, p) => acc + p.totalSteps, 0)

  const stats = [
    {
      icon: Flame,
      label: "In Progress",
      value: totalActive,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-500/10",
    },
    {
      icon: Trophy,
      label: "Completed",
      value: totalCompleted,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-500/10",
    },
    {
      icon: Target,
      label: "Steps Done",
      value: totalStepsDone,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-500/10",
    },
    {
      icon: GraduationCap,
      label: "Certificates",
      value: totalCompleted,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-500/10",
    },
  ]

  return (
    <div className="space-y-8">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat, index) => (
          <Card 
            key={stat.label} 
            className="relative overflow-hidden group hover:shadow-lg transition-all duration-300"
          >
            <CardContent className="pt-6 pb-4">
              <div className={`absolute top-3 right-3 p-2 rounded-full ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div className={`text-3xl font-bold ${stat.color}`}>
                <NumberTicker value={stat.value} delay={index * 0.1} />
              </div>
              <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
            </CardContent>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-20 group-hover:opacity-40 transition-opacity" />
          </Card>
        ))}
      </div>

      {/* Active enrollments */}
      {activeEnrollments.length > 0 && (
        <Card className="relative overflow-hidden">
          <BorderBeam size={300} duration={10} colorFrom="hsl(var(--primary))" colorTo="hsl(var(--primary) / 0.3)" />
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-primary/10">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Continue Learning</CardTitle>
                <CardDescription>Pick up where you left off</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeEnrollments.map((progress, index) => (
              <Link
                key={progress.id}
                href={`/training/${progress.track_id}`}
                className="group flex items-center gap-4 p-4 rounded-xl border bg-gradient-to-r from-background to-muted/30 hover:from-primary/5 hover:to-primary/10 transition-all duration-300 hover:shadow-md"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold truncate group-hover:text-primary transition-colors">
                      {progress.track.name}
                    </span>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {progress.track.department?.name || "General"}
                    </Badge>
                  </div>
                  <ProgressIndicator value={progress.percentComplete} size="sm" animated />
                  <p className="text-sm text-muted-foreground mt-2">
                    <span className="font-medium text-foreground">{progress.completedSteps}</span> of {progress.totalSteps} steps completed
                  </p>
                </div>
                <div className="shrink-0 p-2 rounded-full bg-muted/50 group-hover:bg-primary/10 transition-colors">
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Completed tracks */}
      {completedTracks.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-green-500/10">
                <Trophy className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Completed Tracks</CardTitle>
                <CardDescription>Your training achievements</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {completedTracks.map((progress) => (
              <div
                key={progress.id}
                className="group flex items-center gap-4 p-4 rounded-xl border bg-gradient-to-r from-green-50/50 to-green-100/30 dark:from-green-950/20 dark:to-green-900/10"
              >
                <div className="p-3 rounded-full bg-green-500/10">
                  <GraduationCap className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold truncate block">{progress.track.name}</span>
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span>{progress.track.department?.name || "General"}</span>
                    {progress.completed_at && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(progress.completed_at).toLocaleDateString("en-US", { 
                          month: "short", 
                          day: "numeric",
                          year: "numeric"
                        })}
                      </span>
                    )}
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild className="group-hover:border-green-500 group-hover:text-green-600 transition-colors">
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
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
          <CardContent className="relative flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-muted mb-4">
              <GraduationCap className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-xl">No Training Progress Yet</h3>
            <p className="text-muted-foreground mt-2 max-w-md">
              Browse available training tracks and enroll to start building your skills and earning certificates.
            </p>
            <Button asChild className="mt-6" size="lg">
              <Link href="/training">
                <BookOpen className="mr-2 h-4 w-4" />
                Browse Training Tracks
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
