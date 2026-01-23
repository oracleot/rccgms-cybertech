"use client"

import { useState, useEffect } from "react"
import { format, addDays, startOfWeek, isSameDay } from "date-fns"
import { ChevronLeft, ChevronRight, Loader2, Check, X, Minus, User } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { getTeamAvailability } from "@/app/(dashboard)/rota/availability/actions"

interface TeamMemberAvailability {
  userId: string
  userName: string
  avatarUrl: string | null
  departmentName: string | null
  dates: Array<{ date: string; isAvailable: boolean; notes: string | null }>
}

interface Department {
  id: string
  name: string
}

interface TeamAvailabilityGridProps {
  departments: Department[]
  className?: string
}

export function TeamAvailabilityGrid({ departments, className }: TeamAvailabilityGridProps) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }))
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all")
  const [teamAvailability, setTeamAvailability] = useState<TeamMemberAvailability[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Get the 7 days of the week
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Navigate weeks
  const goToPreviousWeek = () => setWeekStart((prev) => addDays(prev, -7))
  const goToNextWeek = () => setWeekStart((prev) => addDays(prev, 7))
  const goToCurrentWeek = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }))

  // Fetch team availability
  const fetchAvailability = async () => {
    setIsLoading(true)
    const startDate = format(weekStart, "yyyy-MM-dd")
    const endDate = format(addDays(weekStart, 6), "yyyy-MM-dd")

    try {
      const result = await getTeamAvailability(
        startDate,
        endDate,
        selectedDepartment === "all" ? undefined : selectedDepartment
      )

      if (result.success) {
        setTeamAvailability(result.data)
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      console.error("Error fetching team availability:", error)
      toast.error("Failed to load team availability")
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch on mount and when dependencies change
  useEffect(() => {
    const loadData = async () => {
      await fetchAvailability()
    }
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchAvailability is stable, only re-fetch when week/department changes
  }, [weekStart, selectedDepartment])

  // Get availability status for a team member on a specific date
  const getAvailabilityStatus = (
    member: TeamMemberAvailability,
    date: Date
  ): { status: "available" | "unavailable" | "unknown"; notes: string | null } => {
    const dateStr = format(date, "yyyy-MM-dd")
    const av = member.dates.find((d) => d.date === dateStr)
    if (!av) {
      return { status: "unknown", notes: null }
    }
    return {
      status: av.isAvailable ? "available" : "unavailable",
      notes: av.notes,
    }
  }

  // Count availability for a date
  const getDateStats = (date: Date) => {
    let available = 0
    let unavailable = 0
    let unknown = 0

    teamAvailability.forEach((member) => {
      const { status } = getAvailabilityStatus(member, date)
      if (status === "available") available++
      else if (status === "unavailable") unavailable++
      else unknown++
    })

    return { available, unavailable, unknown }
  }

  // Check if date is Sunday
  const isSunday = (date: Date) => date.getDay() === 0

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Team Availability</CardTitle>
            <CardDescription>
              View team member availability for scheduling
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Week Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {format(weekStart, "MMM d")} - {format(addDays(weekStart, 6), "MMM d, yyyy")}
            </span>
            <Button variant="ghost" size="sm" onClick={goToCurrentWeek}>
              Today
            </Button>
          </div>
          <Button variant="outline" size="icon" onClick={goToNextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-sm border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-green-100 flex items-center justify-center">
              <Check className="h-3 w-3 text-green-600" />
            </div>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-red-100 flex items-center justify-center">
              <X className="h-3 w-3 text-red-600" />
            </div>
            <span>Unavailable</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center">
              <Minus className="h-3 w-3 text-gray-400" />
            </div>
            <span>Not set</span>
          </div>
        </div>

        {/* Availability Grid */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr>
                <th className="text-left py-2 px-3 font-medium text-sm">Team Member</th>
                {weekDays.map((day) => (
                  <th
                    key={day.toISOString()}
                    className={cn(
                      "text-center py-2 px-1 font-medium text-sm w-20",
                      isSunday(day) && "bg-blue-50"
                    )}
                  >
                    <div>{format(day, "EEE")}</div>
                    <div
                      className={cn(
                        "text-xs font-normal",
                        isSameDay(day, new Date()) && "text-primary font-semibold"
                      )}
                    >
                      {format(day, "d")}
                    </div>
                  </th>
                ))}
              </tr>
              {/* Stats Row */}
              <tr className="border-t bg-muted/50">
                <td className="py-2 px-3 text-xs text-muted-foreground">Summary</td>
                {weekDays.map((day) => {
                  const stats = getDateStats(day)
                  return (
                    <td key={`stats-${day.toISOString()}`} className="text-center py-2 px-1">
                      <div className="flex justify-center gap-1 text-xs">
                        <span className="text-green-600">{stats.available}</span>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-red-600">{stats.unavailable}</span>
                      </div>
                    </td>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {teamAvailability.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-muted-foreground">
                    No team members found
                  </td>
                </tr>
              ) : (
                teamAvailability.map((member) => (
                  <tr key={member.userId} className="border-t hover:bg-muted/50">
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.avatarUrl || undefined} />
                          <AvatarFallback>
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm">{member.userName}</div>
                          {member.departmentName && (
                            <div className="text-xs text-muted-foreground">
                              {member.departmentName}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    {weekDays.map((day) => {
                      const { status, notes } = getAvailabilityStatus(member, day)
                      return (
                        <td
                          key={`${member.userId}-${day.toISOString()}`}
                          className={cn("text-center py-2 px-1", isSunday(day) && "bg-blue-50/50")}
                        >
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={cn(
                                    "w-8 h-8 mx-auto rounded flex items-center justify-center cursor-default",
                                    status === "available" && "bg-green-100",
                                    status === "unavailable" && "bg-red-100",
                                    status === "unknown" && "bg-gray-100"
                                  )}
                                >
                                  {status === "available" && (
                                    <Check className="h-4 w-4 text-green-600" />
                                  )}
                                  {status === "unavailable" && (
                                    <X className="h-4 w-4 text-red-600" />
                                  )}
                                  {status === "unknown" && (
                                    <Minus className="h-4 w-4 text-gray-400" />
                                  )}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-sm">
                                  <div className="font-medium">
                                    {status === "available" && "Available"}
                                    {status === "unavailable" && "Unavailable"}
                                    {status === "unknown" && "Not set"}
                                  </div>
                                  {notes && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {notes}
                                    </div>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                      )
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Availability Summary */}
        {teamAvailability.length > 0 && (
          <div className="border-t pt-4 mt-4">
            <h4 className="text-sm font-medium mb-3">Sunday Availability Summary</h4>
            <div className="flex flex-wrap gap-2">
              {weekDays
                .filter(isSunday)
                .map((sunday) => {
                  const stats = getDateStats(sunday)
                  const total = teamAvailability.length
                  const percentage = total > 0 ? Math.round((stats.available / total) * 100) : 0
                  return (
                    <Badge
                      key={sunday.toISOString()}
                      variant={percentage >= 50 ? "default" : "secondary"}
                      className={cn(
                        percentage >= 75 && "bg-green-600",
                        percentage >= 50 && percentage < 75 && "bg-yellow-600",
                        percentage < 50 && "bg-red-600"
                      )}
                    >
                      {format(sunday, "MMM d")}: {stats.available}/{total} ({percentage}%)
                    </Badge>
                  )
                })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
