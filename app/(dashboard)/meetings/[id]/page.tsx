import { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronRight, Pencil, User } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { PlatformBadge, MeetingStatusBadge } from "@/components/meetings/meeting-badges"
import { JoinMeetingButton } from "@/components/meetings/join-meeting-button"
import { AddToCalendar } from "@/components/meetings/add-to-calendar"
import { RespondButtons } from "@/components/meetings/respond-buttons"
import { CancelMeetingButton } from "./_components/cancel-meeting-button"
import { getMeetingById } from "@/lib/meetings/queries"
import { getCurrentProfile } from "@/lib/auth/profile"
import { formatMeetingDate, formatMeetingTimeRange } from "@/lib/meetings/format"
import { meetingToCalendarEvent } from "@/lib/meetings/calendar-event"
import { ROUTES } from "@/lib/constants"

const MANAGER_ROLES = ["admin", "lead_developer", "leader"]

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const meeting = await getMeetingById(id)
  return { title: meeting ? `${meeting.title} | Cyber Tech` : "Meeting | Cyber Tech" }
}

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [meeting, profile] = await Promise.all([getMeetingById(id), getCurrentProfile()])

  if (!meeting) notFound()

  const canManage = profile ? MANAGER_ROLES.includes(profile.role) : false
  const myAttendance = profile ? meeting.attendees.find((a) => a.user_id === profile.id) : undefined

  const required = meeting.attendees.filter((a) => a.is_required)
  const optional = meeting.attendees.filter((a) => !a.is_required)

  const event = meetingToCalendarEvent({
    ...meeting,
    creatorEmail: meeting.creator?.email,
    creatorName: meeting.creator?.name,
    attendeeEmails: meeting.attendees.map((a) => a.user?.email).filter((e): e is string => Boolean(e)),
  })

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href={ROUTES.MEETINGS} className="hover:text-foreground transition-colors">
          Meetings
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="truncate text-foreground font-medium">{meeting.title}</span>
      </nav>

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{meeting.title}</h1>
            <MeetingStatusBadge status={meeting.status} />
          </div>
          <p className="text-muted-foreground">
            {formatMeetingDate(meeting.start_time, meeting.timezone)},{" "}
            {formatMeetingTimeRange(meeting.start_time, meeting.end_time, meeting.timezone)}
          </p>
          <PlatformBadge platform={meeting.platform} />
        </div>

        {canManage && meeting.status !== "cancelled" && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href={`/meetings/${meeting.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
            <CancelMeetingButton meetingId={meeting.id} />
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Where &amp; When</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <JoinMeetingButton
                platform={meeting.platform}
                meetingLink={meeting.meeting_link}
                location={meeting.location}
              />
              <AddToCalendar meetingId={meeting.id} event={event} />
            </CardContent>
          </Card>

          {meeting.agenda && (
            <Card>
              <CardHeader>
                <CardTitle>Agenda</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{meeting.agenda}</p>
              </CardContent>
            </Card>
          )}

          {myAttendance && meeting.status !== "cancelled" && (
            <Card>
              <CardHeader>
                <CardTitle>Your RSVP</CardTitle>
              </CardHeader>
              <CardContent>
                <RespondButtons meetingId={meeting.id} currentResponse={myAttendance.response} />
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Attendees ({meeting.attendees.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <AttendeeGroup label="Required" attendees={required} />
              {optional.length > 0 && (
                <>
                  <Separator />
                  <AttendeeGroup label="Optional" attendees={optional} />
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Organizer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={meeting.creator?.avatar_url || undefined} />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{meeting.creator?.name}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

const RESPONSE_BADGE_CLASSES: Record<string, string> = {
  accepted: "bg-green-500/10 text-green-600 border-green-500/20",
  declined: "bg-red-500/10 text-red-600 border-red-500/20",
  tentative: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  pending: "bg-gray-500/10 text-gray-500 border-gray-500/20",
}

function AttendeeGroup({
  label,
  attendees,
}: {
  label: string
  attendees: Array<{ id: string; response: string; user: { name: string; avatar_url: string | null } | null }>
}) {
  if (attendees.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <div className="space-y-2">
        {attendees.map((attendee) => (
          <div key={attendee.id} className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <Avatar className="h-6 w-6 shrink-0">
                <AvatarImage src={attendee.user?.avatar_url || undefined} />
                <AvatarFallback>
                  <User className="h-3 w-3" />
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-sm">{attendee.user?.name}</span>
            </div>
            <Badge variant="outline" className={RESPONSE_BADGE_CLASSES[attendee.response]}>
              {attendee.response}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  )
}
