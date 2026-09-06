import Link from "next/link"
import { ArrowRight, Video, Users } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlatformBadge } from "@/components/meetings/meeting-badges"
import { getUpcomingMeetingsForUser } from "@/lib/meetings/queries"
import { formatMeetingDate, formatMeetingTimeRange } from "@/lib/meetings/format"

export async function UpcomingMeetings() {
  const meetings = await getUpcomingMeetingsForUser(4)

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-violet-500/10">
              <Video className="h-4 w-4 text-violet-500" />
            </div>
            Upcoming Meetings
          </CardTitle>
          <CardDescription className="mt-1">
            {meetings.length > 0 ? "What's on your calendar" : "Nothing scheduled"}
          </CardDescription>
        </div>
        {meetings.length > 0 && (
          <Button variant="ghost" size="sm" asChild className="group">
            <Link href="/meetings" className="flex items-center">
              View all
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {meetings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">No upcoming meetings</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {meetings.map((meeting) => (
              <li key={meeting.id}>
                <Link
                  href={`/meetings/${meeting.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{meeting.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatMeetingDate(meeting.start_time, meeting.timezone)} ·{" "}
                      {formatMeetingTimeRange(meeting.start_time, meeting.end_time, meeting.timezone)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <PlatformBadge platform={meeting.platform} />
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {meeting.attendeeCount}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
