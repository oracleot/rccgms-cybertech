import { Video, MapPin } from "lucide-react"

import { Button } from "@/components/ui/button"
import { platformLabel } from "@/lib/meetings/platforms"
import type { MeetingPlatform } from "@/types/meeting"

interface JoinMeetingButtonProps {
  platform: MeetingPlatform
  meetingLink: string | null
  location: string | null
  size?: "default" | "lg" | "sm"
}

/**
 * The join link needs to be clearly displayed to attendees - this is
 * intentionally the most prominent action on the meeting detail page,
 * not a small link buried in the agenda text.
 */
export function JoinMeetingButton({ platform, meetingLink, location, size = "lg" }: JoinMeetingButtonProps) {
  if (platform === "in_person") {
    return (
      <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <span>{location || "Location to be confirmed"}</span>
      </div>
    )
  }

  if (!meetingLink) {
    return (
      <p className="text-sm text-muted-foreground">
        No {platformLabel(platform)} link has been added yet.
      </p>
    )
  }

  return (
    <Button asChild size={size} className="bg-green-600 hover:bg-green-700">
      <a href={meetingLink} target="_blank" rel="noopener noreferrer">
        <Video className="mr-2 h-4 w-4" />
        Join {platformLabel(platform)}
      </a>
    </Button>
  )
}
