"use client"

import { useState } from "react"
import { Calendar, List, Plus, User, CalendarDays, Users } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RotaCalendar } from "@/components/rota/rota-calendar"
import { RotaList } from "@/components/rota/rota-list"
import { useUser } from "@/hooks/use-user"

export default function RotaPage() {
  const [view, setView] = useState<"calendar" | "list">("calendar")
  const { user } = useUser()

  const canCreateRota = user?.role === "admin" || user?.role === "leader"
  const isLeaderOrAdmin = user?.role === "admin" || user?.role === "leader"

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rota</h1>
          <p className="text-muted-foreground">
            View and manage service schedules
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/rota/my-schedule">
              <User className="mr-2 h-4 w-4" />
              My Schedule
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/rota/availability">
              <CalendarDays className="mr-2 h-4 w-4" />
              Set Availability
            </Link>
          </Button>
          {isLeaderOrAdmin && (
            <Button variant="outline" asChild>
              <Link href="/rota/team-availability">
                <Users className="mr-2 h-4 w-4" />
                Team Availability
              </Link>
            </Button>
          )}
          {canCreateRota && (
            <Button asChild>
              <Link href="/rota/new">
                <Plus className="mr-2 h-4 w-4" />
                New Rota
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as "calendar" | "list")}>
        <TabsList>
          <TabsTrigger value="calendar" className="gap-2">
            <Calendar className="h-4 w-4" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="list" className="gap-2">
            <List className="h-4 w-4" />
            List
          </TabsTrigger>
        </TabsList>
        <TabsContent value="calendar" className="mt-6">
          <RotaCalendar />
        </TabsContent>
        <TabsContent value="list" className="mt-6">
          <RotaList />
        </TabsContent>
      </Tabs>
    </div>
  )
}
