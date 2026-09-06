import { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronRight } from "lucide-react"

import { requireRole } from "@/lib/auth/guards"
import { USER_ROLES, ROUTES } from "@/lib/constants"
import { getMeetingById } from "@/lib/meetings/queries"
import { MeetingForm, isoToFormFields } from "@/components/meetings/meeting-form"

export const metadata: Metadata = {
  title: "Edit Meeting | Cyber Tech",
}

export default async function EditMeetingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRole([USER_ROLES.ADMIN, USER_ROLES.LEAD_DEVELOPER, USER_ROLES.LEADER], ROUTES.MEETINGS)
  const { id } = await params
  const meeting = await getMeetingById(id)

  if (!meeting) notFound()

  const { date, time: startTime } = isoToFormFields(meeting.start_time, meeting.timezone)
  const { time: endTime } = isoToFormFields(meeting.end_time, meeting.timezone)

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href={`/meetings/${meeting.id}`} className="hover:text-foreground transition-colors">
          {meeting.title}
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Edit</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit Meeting</h1>
      </div>

      <div className="max-w-2xl">
        <MeetingForm
          mode="edit"
          initial={{
            id: meeting.id,
            title: meeting.title,
            agenda: meeting.agenda || "",
            platform: meeting.platform,
            meetingLink: meeting.meeting_link || "",
            location: meeting.location || "",
            date,
            startTime,
            endTime,
            timezone: meeting.timezone,
            reminderLeadMinutes: meeting.reminder_lead_minutes,
            attendeeIds: meeting.attendees.map((a) => a.user_id),
            requiredAttendeeIds: meeting.attendees.filter((a) => a.is_required).map((a) => a.user_id),
          }}
        />
      </div>
    </div>
  )
}
