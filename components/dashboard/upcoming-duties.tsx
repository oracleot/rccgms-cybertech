"use client"

import Link from "next/link"
import { format } from "date-fns"
import { CalendarDays, ArrowRight } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { MyScheduleItem } from "@/types/rota"

interface UpcomingDutiesProps {
  assignments: MyScheduleItem[]
  maxItems?: number
}

export function UpcomingDuties({
  assignments,
  maxItems = 5,
}: UpcomingDutiesProps) {
  const displayedAssignments = assignments.slice(0, maxItems)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Upcoming Duties
          </CardTitle>
          <CardDescription>
            Your scheduled service assignments
          </CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/rota/my-schedule">
            View All
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {displayedAssignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CalendarDays className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No upcoming duties scheduled
            </p>
            <Button variant="link" size="sm" asChild className="mt-2">
              <Link href="/rota/availability">
                Set your availability
              </Link>
            </Button>
          </div>
        ) : (
          <ul className="space-y-3">
            {displayedAssignments.map((assignment) => (
              <li key={assignment.id}>
                <Link
                  href={`/rota/${assignment.rotaId}`}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {assignment.positionName}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {assignment.departmentName}
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {assignment.serviceName}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {format(new Date(assignment.date), "EEE, MMM d")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(assignment.date), "yyyy")}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
