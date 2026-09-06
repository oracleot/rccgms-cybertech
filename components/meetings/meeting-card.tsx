import Link from "next/link"
import { Users, Calendar } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PlatformBadge, MeetingStatusBadge } from "@/components/meetings/meeting-badges"
import { formatMeetingDate, formatMeetingTimeRange } from "@/lib/meetings/format"
import type { MeetingListItem } from "@/types/meeting"

interface MeetingCardProps {
  meeting: MeetingListItem
}

const RESPONSE_LABELS: Record<string, string> = {
  accepted: "You're going",
  declined: "You declined",
  tentative: "You said maybe",
}

export function MeetingCard({ meeting }: MeetingCardProps) {
  return (
    <Link href={`/meetings/${meeting.id}`}>
      <Card className="transition-colors hover:border-violet-500/40 hover:bg-muted/30">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-medium truncate">{meeting.title}</h3>
              <MeetingStatusBadge status={meeting.status} />
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>
                {formatMeetingDate(meeting.start_time, meeting.timezone)},{" "}
                {formatMeetingTimeRange(meeting.start_time, meeting.end_time, meeting.timezone)}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <PlatformBadge platform={meeting.platform} />
            <Badge variant="secondary" className="gap-1">
              <Users className="h-3 w-3" />
              {meeting.attendeeCount}
            </Badge>
            {meeting.myResponse && meeting.myResponse !== "pending" && (
              <Badge variant="outline" className="hidden sm:inline-flex">
                {RESPONSE_LABELS[meeting.myResponse]}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
