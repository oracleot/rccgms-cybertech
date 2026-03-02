import { Metadata } from "next"
import Link from "next/link"
import { CalendarDays, Users, ChevronRight } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { AvailabilityCalendar } from "@/components/rota/availability-calendar"

export const metadata: Metadata = {
  title: "My Availability | Cyber Tech",
  description: "Set your availability for upcoming services",
}

export default async function AvailabilityPage() {
  const supabase = await createClient()
  
  // Get current user's profile
  const { data: { user } } = await supabase.auth.getUser()
  
  let isLeaderOrAdmin = false
  if (user) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("role")
      .eq("auth_user_id", user.id)
      .single()
    
    const profile = profileData as { role: string } | null
    if (profile) {
      isLeaderOrAdmin = profile.role === "admin" || profile.role === "lead_developer" || profile.role === "developer" || profile.role === "leader"
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/rota" className="hover:text-foreground transition-colors">
          Rota
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Set Availability</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Availability</h1>
          <p className="text-muted-foreground">
            Let your team know when you&apos;re available to serve
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isLeaderOrAdmin && (
            <Button variant="outline" asChild>
              <Link href="/rota/team-availability">
                <Users className="h-4 w-4 mr-2" />
                View Team Availability
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
        <CalendarDays className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h3 className="font-medium text-blue-900">How it works</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Click on dates in the calendar to select them</li>
            <li>• Use the &quot;Mark Available&quot; or &quot;Mark Unavailable&quot; buttons to set your availability</li>
            <li>• Use quick actions to select multiple Sundays at once</li>
            <li>• Leaders will see your availability when creating rotas</li>
          </ul>
        </div>
      </div>

      {/* Availability Calendar */}
      <AvailabilityCalendar className="max-w-2xl" />
    </div>
  )
}
