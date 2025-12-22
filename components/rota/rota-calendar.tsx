"use client"

import { useCallback, useEffect, useState } from "react"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import interactionPlugin from "@fullcalendar/interaction"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface CalendarEvent {
  id: string
  title: string
  start: string
  backgroundColor?: string
  borderColor?: string
  extendedProps: {
    status: string
    assignmentCount: number
    serviceName: string
  }
}

interface RotaQueryResult {
  id: string
  date: string
  status: string
  published_at: string | null
  service: { id: string; name: string } | null
  assignments: { id: string }[] | null
}

export function RotaCalendar() {
  const router = useRouter()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  const fetchRotas = useCallback(async (startDate: string, endDate: string) => {
    setIsLoading(true)
    try {
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
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: true })

      if (error) throw error

      const rotas = (data || []) as unknown as RotaQueryResult[]

      const calendarEvents: CalendarEvent[] = rotas.map((rota) => ({
        id: rota.id,
        title: rota.service?.name || "Service",
        start: rota.date,
        backgroundColor: rota.status === "published" ? "#22c55e" : "#f59e0b",
        borderColor: rota.status === "published" ? "#16a34a" : "#d97706",
        extendedProps: {
          status: rota.status,
          assignmentCount: rota.assignments?.length || 0,
          serviceName: rota.service?.name || "Service",
        },
      }))

      setEvents(calendarEvents)
    } catch (error) {
      console.error("Error fetching rotas:", error)
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    // Fetch rotas for current month
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    
    fetchRotas(
      startOfMonth.toISOString().split("T")[0],
      endOfMonth.toISOString().split("T")[0]
    )
  }, [fetchRotas])

  const handleEventClick = (info: { event: { id: string } }) => {
    router.push(`/rota/${info.event.id}`)
  }

  const handleDateClick = (info: { dateStr: string }) => {
    router.push(`/rota/new?date=${info.dateStr}`)
  }

  const handleDatesSet = (info: { start: Date; end: Date }) => {
    const startDate = info.start.toISOString().split("T")[0]
    const endDate = info.end.toISOString().split("T")[0]
    fetchRotas(startDate, endDate)
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[500px] w-full" />
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={events}
        eventClick={handleEventClick}
        dateClick={handleDateClick}
        datesSet={handleDatesSet}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,dayGridWeek",
        }}
        height="auto"
        eventContent={(eventInfo) => (
          <div className="flex flex-col p-1 text-xs">
            <span className="font-medium truncate">
              {eventInfo.event.title}
            </span>
            <span className="text-[10px] opacity-80">
              {eventInfo.event.extendedProps.assignmentCount} assigned
            </span>
          </div>
        )}
      />
    </Card>
  )
}
