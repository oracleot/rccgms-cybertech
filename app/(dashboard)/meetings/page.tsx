import { Metadata } from "next"
import Link from "next/link"
import { Plus, Video } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MeetingCard } from "@/components/meetings/meeting-card"
import { getMeetings } from "@/lib/meetings/queries"
import { getCurrentProfile } from "@/lib/auth/profile"
import { ROUTES } from "@/lib/constants"

export const metadata: Metadata = {
  title: "Meetings | Cyber Tech",
  description: "Team meetings, calls, and RSVPs",
}

const MANAGER_ROLES = ["admin", "lead_developer", "leader"]

export default async function MeetingsPage() {
  const [upcoming, past, profile] = await Promise.all([
    getMeetings("upcoming"),
    getMeetings("past"),
    getCurrentProfile(),
  ])

  const canCreate = profile ? MANAGER_ROLES.includes(profile.role) : false

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Meetings</h1>
          <p className="text-muted-foreground">Calls, planning sessions, and RSVPs</p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href={ROUTES.MEETINGS_NEW}>
              <Plus className="mr-2 h-4 w-4" />
              New Meeting
            </Link>
          </Button>
        )}
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-3">
          {upcoming.length === 0 ? (
            <EmptyState canCreate={canCreate} />
          ) : (
            upcoming.map((meeting) => <MeetingCard key={meeting.id} meeting={meeting} />)
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-3">
          {past.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No past meetings</p>
          ) : (
            past.map((meeting) => <MeetingCard key={meeting.id} meeting={meeting} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function EmptyState({ canCreate }: { canCreate: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/10 text-violet-500">
        <Video className="h-6 w-6" />
      </div>
      <p className="font-medium">No upcoming meetings</p>
      <p className="text-sm text-muted-foreground">
        {canCreate ? "Schedule one to get started." : "Check back later."}
      </p>
      {canCreate && (
        <Button asChild size="sm">
          <Link href={ROUTES.MEETINGS_NEW}>
            <Plus className="mr-2 h-4 w-4" />
            New Meeting
          </Link>
        </Button>
      )}
    </div>
  )
}
