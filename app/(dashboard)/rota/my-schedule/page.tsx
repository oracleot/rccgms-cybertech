import { format } from "date-fns"
import { Calendar, MapPin, Clock, ChevronRight } from "lucide-react"
import Link from "next/link"

import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/shared/empty-state"

interface ScheduleItem {
  id: string
  date: string
  status: string
  confirmedAt: string | null
  rota: {
    id: string
    date: string
    status: string
    service: {
      name: string
      start_time: string | null
      end_time: string | null
      location: string | null
    } | null
  }
  position: {
    name: string
    department: {
      name: string
      color: string | null
    }
  }
}

export default async function MySchedulePage() {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return <div>Please log in to view your schedule.</div>
  }

  // Get profile
  const { data: profileQueryResult, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .single()

  if (profileError || !profileQueryResult) {
    return <div>Profile not found.</div>
  }

  const profile = profileQueryResult as unknown as { id: string }

  const today = new Date().toISOString().split("T")[0]

  // Fetch user's assignments
  const { data: assignmentsData, error } = await supabase
    .from("rota_assignments")
    .select(`
      id,
      status,
      confirmed_at,
      rota:rotas(
        id,
        date,
        status,
        service:services(name, start_time, end_time, location)
      ),
      position:positions(name, department:departments(name, color))
    `)
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(20)

  if (error) {
    console.error("Error fetching schedule:", error)
  }

  // Type assertion and filter for assignments with valid rotas
  const rawAssignments = assignmentsData as unknown as Array<{
    id: string
    status: string
    confirmed_at: string | null
    rota: {
      id: string
      date: string
      status: string
      service: { name: string; start_time: string | null; end_time: string | null; location: string | null } | null
    } | null
    position: { name: string; department: { name: string; color: string | null } }
  }> | null

  // Filter out any null rotas and past dates, and only show published
  const scheduleItems: ScheduleItem[] = (rawAssignments || [])
    .filter((a) => a.rota !== null && a.rota.date >= today && a.rota.status === "published")
    .map((a) => ({
      id: a.id,
      date: a.rota!.date,
      status: a.status,
      confirmedAt: a.confirmed_at,
      rota: a.rota as ScheduleItem["rota"],
      position: a.position as ScheduleItem["position"],
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/rota" className="hover:text-foreground transition-colors">
          Rota
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">My Schedule</span>
      </nav>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Schedule</h1>
        <p className="text-muted-foreground">
          View your upcoming service assignments
        </p>
      </div>

      {scheduleItems.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-6 w-6 text-muted-foreground" />}
          title="No upcoming assignments"
          description="You don't have any scheduled services coming up."
        />
      ) : (
        <div className="space-y-4">
          {scheduleItems.map((item) => (
            <Card key={item.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {item.rota.service?.name || "Service"}
                    </CardTitle>
                    <CardDescription>
                      {format(new Date(item.rota.date), "EEEE, MMMM d, yyyy")}
                    </CardDescription>
                  </div>
                  <Badge
                    variant={item.status === "confirmed" ? "default" : "secondary"}
                    className={
                      item.status === "confirmed"
                        ? "bg-green-500 hover:bg-green-600"
                        : item.status === "declined"
                        ? "bg-red-500 hover:bg-red-600"
                        : ""
                    }
                  >
                    {item.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.position.department.color || "#6b7280" }}
                    />
                    <span className="font-medium">{item.position.name}</span>
                    <span className="text-muted-foreground">
                      ({item.position.department.name})
                    </span>
                  </div>
                  
                  {item.rota.service?.start_time && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>
                        {item.rota.service.start_time.slice(0, 5)}
                        {item.rota.service.end_time && ` - ${item.rota.service.end_time.slice(0, 5)}`}
                      </span>
                    </div>
                  )}

                  {item.rota.service?.location && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{item.rota.service.location}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
