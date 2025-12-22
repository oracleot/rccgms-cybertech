import { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { CalendarDays, ChevronRight } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { TeamAvailabilityGrid } from "@/components/rota/team-availability-grid"

export const metadata: Metadata = {
  title: "Team Availability | Cyber Tech",
  description: "View team member availability for scheduling",
}

export default async function TeamAvailabilityPage() {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login")
  }

  // Check if user is admin or leader
  const { data: profileData } = await supabase
    .from("profiles")
    .select("role")
    .eq("auth_user_id", user.id)
    .single()

  const profile = profileData as { role: string } | null
  if (!profile || (profile.role !== "admin" && profile.role !== "leader")) {
    redirect("/rota/availability")
  }

  // Fetch departments for filtering
  const { data: departmentsData } = await supabase
    .from("departments")
    .select("id, name")
    .order("name", { ascending: true })

  const departments = (departmentsData || []) as Array<{ id: string; name: string }>

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/rota" className="hover:text-foreground transition-colors">
          Rota
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Team Availability</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team Availability</h1>
          <p className="text-muted-foreground">
            View team member availability when planning rotas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/rota/availability">
              <CalendarDays className="h-4 w-4 mr-2" />
              Set My Availability
            </Link>
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
        <CalendarDays className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h3 className="font-medium text-amber-900">Scheduling Tips</h3>
          <ul className="text-sm text-amber-700 space-y-1">
            <li>• Green cells indicate team members who are available</li>
            <li>• Red cells indicate team members who are unavailable</li>
            <li>• Gray cells mean the volunteer hasn&apos;t set their availability</li>
            <li>• Hover over cells to see any notes the volunteer has added</li>
            <li>• Use the summary row to quickly see availability counts</li>
          </ul>
        </div>
      </div>

      {/* Team Availability Grid */}
      <TeamAvailabilityGrid departments={departments} />
    </div>
  )
}
