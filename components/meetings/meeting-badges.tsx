import { Video, MapPin } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  PLATFORM_LABELS,
  PLATFORM_BADGE_CLASSES,
  STATUS_LABELS,
  STATUS_BADGE_CLASSES,
  isRemotePlatform,
} from "@/lib/meetings/platforms"
import type { MeetingPlatform, MeetingStatus } from "@/types/meeting"

export function PlatformBadge({ platform }: { platform: MeetingPlatform }) {
  return (
    <Badge variant="outline" className={PLATFORM_BADGE_CLASSES[platform]}>
      {isRemotePlatform(platform) ? (
        <Video className="mr-1 h-3 w-3" />
      ) : (
        <MapPin className="mr-1 h-3 w-3" />
      )}
      {PLATFORM_LABELS[platform]}
    </Badge>
  )
}

export function MeetingStatusBadge({ status }: { status: MeetingStatus }) {
  return (
    <Badge variant="outline" className={STATUS_BADGE_CLASSES[status]}>
      {STATUS_LABELS[status]}
    </Badge>
  )
}
