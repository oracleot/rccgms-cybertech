/**
 * Labels and badge styling for meeting platforms/status.
 */

import type { MeetingPlatform, MeetingStatus } from "@/types/meeting"

export const PLATFORM_LABELS: Record<MeetingPlatform, string> = {
  zoom: "Zoom",
  google_meet: "Google Meet",
  teams: "Microsoft Teams",
  in_person: "In Person",
  other: "Other",
}

export function platformLabel(platform: MeetingPlatform): string {
  return PLATFORM_LABELS[platform] || "Other"
}

export const PLATFORM_BADGE_CLASSES: Record<MeetingPlatform, string> = {
  zoom: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  google_meet: "bg-green-500/10 text-green-500 border-green-500/20",
  teams: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
  in_person: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  other: "bg-gray-500/10 text-gray-500 border-gray-500/20",
}

export const STATUS_LABELS: Record<MeetingStatus, string> = {
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
}

export const STATUS_BADGE_CLASSES: Record<MeetingStatus, string> = {
  scheduled: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  in_progress: "bg-green-500/10 text-green-500 border-green-500/20",
  completed: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
}

export function isRemotePlatform(platform: MeetingPlatform): boolean {
  return platform === "zoom" || platform === "google_meet" || platform === "teams"
}
