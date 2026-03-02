"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { format, startOfMonth, endOfMonth, addMonths, subMonths, isSameDay, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isSameMonth } from "date-fns"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { useUser } from "@/hooks/use-user"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { RotaStatusBadge } from "@/components/rota/rota-status-badge"
import type { RotaStatus } from "@/types/rota"

interface RotaEvent {
  id: string
  date: string
  status: RotaStatus
  serviceName: string
  assignmentCount: number
}

interface RotaQueryResult {
  id: string
  date: string
  status: RotaStatus
  published_at: string | null
  service: { id: string; name: string } | null
  assignments: { id: string }[] | null
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function RotaCalendar() {
  const router = useRouter()
  const { user } = useUser()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [events, setEvents] = useState<RotaEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const canCreateRota = user?.role === "admin" || user?.role === "lead_developer" || user?.role === "developer" || user?.role === "leader"

  const fetchRotas = useCallback(async (month: Date) => {
    setIsLoading(true)
    const supabase = createClient()
    
    try {
      const start = startOfMonth(month)
      const end = endOfMonth(month)
      
      const { data, error } = await supabase
        .from("rotas")
        .select(`
          id,
          date,
          status,
          published_at,
          service:services(id, name),
          assignments:rota_assignments(id)
        `)
        .gte("date", format(start, "yyyy-MM-dd"))
        .lte("date", format(end, "yyyy-MM-dd"))
        .order("date", { ascending: true })

      if (error) throw error

      const rotas = (data || []) as unknown as RotaQueryResult[]

      const rotaEvents: RotaEvent[] = rotas.map((rota) => ({
        id: rota.id,
        date: rota.date,
        status: rota.status,
        serviceName: rota.service?.name || "Service",
        assignmentCount: rota.assignments?.length || 0,
      }))

      setEvents(rotaEvents)
    } catch (error) {
      console.error("Error fetching rotas:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRotas(currentMonth)
  }, [currentMonth, fetchRotas])

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1))
  }

  const handleToday = () => {
    setCurrentMonth(new Date())
    setSelectedDate(new Date())
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
  }

  const handleEventClick = (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    router.push(`/rota/${eventId}`)
  }

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    return events.filter((e) => isSameDay(new Date(e.date), date))
  }

  // Generate calendar days
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  // Selected date events
  const selectedDateEvents = selectedDate ? getEventsForDate(selectedDate) : []

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-20" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      {/* Calendar */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <h2 className="text-xl font-semibold">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleToday}>
              Today
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 mb-2">
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="text-center text-sm font-medium text-muted-foreground py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
            {calendarDays.map((day) => {
              const dayEvents = getEventsForDate(day)
              const isCurrentMonth = isSameMonth(day, currentMonth)
              const isSelected = selectedDate && isSameDay(day, selectedDate)
              const isTodayDate = isToday(day)

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => handleDateClick(day)}
                  className={cn(
                    "min-h-24 p-1.5 bg-card text-left flex flex-col transition-colors hover:bg-accent",
                    !isCurrentMonth && "bg-muted/30 text-muted-foreground",
                    isSelected && "ring-2 ring-primary ring-inset",
                    isTodayDate && "bg-accent/50"
                  )}
                >
                  <span
                    className={cn(
                      "text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full",
                      isTodayDate && "bg-primary text-primary-foreground"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  <div className="flex flex-col gap-0.5 w-full overflow-hidden flex-1">
                    {dayEvents.slice(0, 2).map((event) => (
                      <div
                        key={event.id}
                        onClick={(e) => handleEventClick(event.id, e)}
                        className={cn(
                          "text-[11px] px-1.5 py-0.5 rounded truncate text-white cursor-pointer hover:opacity-90 transition-opacity",
                          event.status === "published"
                            ? "bg-green-500"
                            : "bg-amber-500"
                        )}
                        title={`${event.serviceName} (${event.assignmentCount} assigned)`}
                      >
                        {event.serviceName}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="text-[10px] text-muted-foreground px-1">
                        +{dayEvents.length - 2} more
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Sidebar - Selected Date Details */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <h3 className="font-semibold">
              {selectedDate
                ? format(selectedDate, "EEEE, MMMM d, yyyy")
                : "Select a date"}
            </h3>
          </CardHeader>
          <CardContent>
            {selectedDate ? (
              selectedDateEvents.length > 0 ? (
                <div className="space-y-3">
                  {selectedDateEvents.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => router.push(`/rota/${event.id}`)}
                      className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{event.serviceName}</span>
                        <RotaStatusBadge status={event.status} />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {event.assignmentCount} volunteers assigned
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground mb-4">No rotas scheduled</p>
                  {canCreateRota && (
                    <Button
                      variant="outline"
                      onClick={() =>
                        router.push(
                          `/rota/new?date=${format(selectedDate, "yyyy-MM-dd")}`
                        )
                      }
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create Rota
                    </Button>
                  )}
                </div>
              )
            ) : (
              <p className="text-muted-foreground text-center py-6">
                Click on a date to view details
              </p>
            )}
          </CardContent>
        </Card>

        {/* Legend */}
        <Card>
          <CardContent className="py-3">
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-500" />
                <span>Published</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-amber-500" />
                <span>Draft</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
