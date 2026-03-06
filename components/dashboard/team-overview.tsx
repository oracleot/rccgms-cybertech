"use client"

import Link from "next/link"
import { Users, ArrowRight, UserCheck, UserX, Calendar } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

interface DepartmentStats {
  id: string
  name: string
  totalMembers: number
  availableThisSunday: number
  assignedThisSunday: number
}

interface TeamOverviewProps {
  departments: DepartmentStats[]
  totalMembers: number
  activeMembers: number
  upcomingServices: number
}

export function TeamOverview({
  departments,
  totalMembers,
  activeMembers,
  upcomingServices,
}: TeamOverviewProps) {
  const overallAvailability =
    totalMembers > 0
      ? Math.round((activeMembers / totalMembers) * 100)
      : 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Overview
          </CardTitle>
          <CardDescription>
            Department availability for upcoming services
          </CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/rota/team-availability">
            View Details
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col items-center justify-center rounded-lg border p-3">
            <Users className="h-5 w-5 text-muted-foreground mb-1" />
            <span className="text-2xl font-bold">{totalMembers}</span>
            <span className="text-xs text-muted-foreground">Total</span>
          </div>
          <div className="flex flex-col items-center justify-center rounded-lg border p-3">
            <UserCheck className="h-5 w-5 text-green-600 mb-1" />
            <span className="text-2xl font-bold text-green-600">
              {activeMembers}
            </span>
            <span className="text-xs text-muted-foreground">Available</span>
          </div>
          <div className="flex flex-col items-center justify-center rounded-lg border p-3">
            <Calendar className="h-5 w-5 text-blue-600 mb-1" />
            <span className="text-2xl font-bold text-blue-600">
              {upcomingServices}
            </span>
            <span className="text-xs text-muted-foreground">Services</span>
          </div>
        </div>

        {/* Overall Availability */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Overall Team Availability
            </span>
            <span className="font-medium">{overallAvailability}%</span>
          </div>
          <Progress value={overallAvailability} className="h-2" />
        </div>

        {/* Department Breakdown */}
        {departments.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">By Department</h4>
            <ul className="space-y-2">
              {departments.map((dept) => {
                const availability =
                  dept.totalMembers > 0
                    ? Math.round(
                        (dept.availableThisSunday / dept.totalMembers) * 100
                      )
                    : 0
                const isLowAvailability = availability < 50

                return (
                  <li
                    key={dept.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full ${
                          isLowAvailability
                            ? "bg-amber-100 text-amber-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {isLowAvailability ? (
                          <UserX className="h-4 w-4" />
                        ) : (
                          <UserCheck className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{dept.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {dept.availableThisSunday} of {dept.totalMembers}{" "}
                          available
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-lg font-bold ${
                          isLowAvailability
                            ? "text-amber-600"
                            : "text-green-600"
                        }`}
                      >
                        {availability}%
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* Empty State */}
        {departments.length === 0 && (
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <Users className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No department data available
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
