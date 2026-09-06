"use client"

import { useState } from "react"
import {
  Calendar,
  List,
  Plus,
  User,
  CalendarDays,
  Users,
  ArrowRightLeft,
  MoreHorizontal,
  Sparkles,
} from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RotaCalendar } from "@/components/rota/rota-calendar"
import { RotaList } from "@/components/rota/rota-list"
import { AvailabilityOverview } from "@/components/rota/availability-overview"
import { useUser } from "@/hooks/use-user"

export default function RotaPage() {
  const [view, setView] = useState<"calendar" | "list" | "availability">("calendar")
  const { user } = useUser()

  const canManage =
    user?.role === "admin" ||
    user?.role === "lead_developer" ||
    user?.role === "developer" ||
    user?.role === "leader"

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rota</h1>
          <p className="text-muted-foreground">
            View and manage service schedules
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="More rota actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/rota/my-schedule">
                  <User className="mr-2 h-4 w-4" />
                  My Schedule
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/rota/swaps">
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  Swaps
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/rota/availability">
                  <CalendarDays className="mr-2 h-4 w-4" />
                  Set Availability
                </Link>
              </DropdownMenuItem>
              {canManage && (
                <DropdownMenuItem asChild>
                  <Link href="/rota/team-availability">
                    <Users className="mr-2 h-4 w-4" />
                    Team Availability
                  </Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          {canManage && (
            <Button asChild>
              <Link href="/rota/new">
                <Plus className="mr-2 h-4 w-4" />
                New Rota
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as "calendar" | "list" | "availability")}>
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="calendar" className="shrink-0 gap-2">
            <Calendar className="h-4 w-4" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="list" className="shrink-0 gap-2">
            <List className="h-4 w-4" />
            List
          </TabsTrigger>
          {canManage && (
            <TabsTrigger value="availability" className="shrink-0 gap-2">
              <Sparkles className="h-4 w-4" />
              Availability
            </TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="calendar" className="mt-6">
          <RotaCalendar />
        </TabsContent>
        <TabsContent value="list" className="mt-6">
          <RotaList />
        </TabsContent>
        {canManage && (
          <TabsContent value="availability" className="mt-6">
            <AvailabilityOverview />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
