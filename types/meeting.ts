/**
 * Meeting-related types
 */

import type { Tables, Enums } from "./database"
import type { Profile } from "./auth"

// Base types from database
export type Meeting = Tables<"meetings">
export type MeetingAttendee = Tables<"meeting_attendees">

// Enum types
export type MeetingPlatform = Enums<"meeting_platform">
export type MeetingStatus = Enums<"meeting_status">
export type AttendeeResponse = Enums<"attendee_response">

// Attendee with profile info
export interface MeetingAttendeeWithUser extends MeetingAttendee {
  user: Profile
}

// Meeting with attendees and creator
export interface MeetingWithDetails extends Meeting {
  creator: Profile
  attendees: MeetingAttendeeWithUser[]
}

// Meeting for list/card display
export interface MeetingListItem extends Meeting {
  attendeeCount: number
  myResponse: AttendeeResponse | null
}

// Create meeting payload
export interface CreateMeetingData {
  title: string
  agenda?: string
  platform: MeetingPlatform
  meetingLink?: string
  location?: string
  startTime: string
  endTime: string
  timezone: string
  reminderLeadMinutes?: number
  attendeeIds: string[]
  requiredAttendeeIds?: string[]
}

// Update meeting payload
export interface UpdateMeetingData extends Partial<CreateMeetingData> {
  id: string
}

// Respond to meeting payload
export interface RespondToMeetingData {
  meetingId: string
  response: Exclude<AttendeeResponse, "pending">
}

// A single person's free/busy/unknown status for a date
export type FreeBusyState = "free" | "busy" | "unknown"

export interface AvailabilityOverlapDay {
  date: string
  people: Array<{
    userId: string
    name: string
    state: FreeBusyState
  }>
  freeCount: number
  busyCount: number
  unknownCount: number
}

export interface SuggestedMeetingDate {
  date: string
  freeCount: number
  freeUserIds: string[]
  totalConsidered: number
}
