import { Metadata } from "next"
import Link from "next/link"
import { ChevronRight } from "lucide-react"

import { requireRole } from "@/lib/auth/guards"
import { USER_ROLES, ROUTES } from "@/lib/constants"
import { MeetingForm } from "@/components/meetings/meeting-form"

export const metadata: Metadata = {
  title: "New Meeting | Cyber Tech",
  description: "Schedule a new meeting",
}

export default async function NewMeetingPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  await requireRole([USER_ROLES.ADMIN, USER_ROLES.LEAD_DEVELOPER, USER_ROLES.LEADER], ROUTES.MEETINGS)
  const { date } = await searchParams

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href={ROUTES.MEETINGS} className="hover:text-foreground transition-colors">
          Meetings
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">New</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Schedule a Meeting</h1>
        <p className="text-muted-foreground">Invite your team and share how to join</p>
      </div>

      <div className="max-w-2xl">
        <MeetingForm mode="create" initial={date ? { date } : undefined} />
      </div>
    </div>
  )
}
