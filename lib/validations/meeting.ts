/**
 * Meeting validation schemas
 */

import { z } from "zod"

const MEETING_PLATFORMS = ["zoom", "google_meet", "teams", "in_person", "other"] as const
const REMOTE_PLATFORMS = new Set(["zoom", "google_meet", "teams"])

function checkMeetingTimes(
  data: { startTime: string; endTime: string; platform: string; meetingLink?: string },
  ctx: z.RefinementCtx
) {
  const start = new Date(data.startTime)
  const end = new Date(data.endTime)

  if (Number.isNaN(start.getTime())) {
    ctx.addIssue({ code: "custom", path: ["startTime"], message: "Invalid start time" })
  }
  if (Number.isNaN(end.getTime())) {
    ctx.addIssue({ code: "custom", path: ["endTime"], message: "Invalid end time" })
  }
  if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end <= start) {
    ctx.addIssue({ code: "custom", path: ["endTime"], message: "End time must be after start time" })
  }
  if (REMOTE_PLATFORMS.has(data.platform) && !data.meetingLink) {
    ctx.addIssue({
      code: "custom",
      path: ["meetingLink"],
      message: "A meeting link is required for this platform",
    })
  }
}

// Shared fields for create/update
const meetingBaseSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be less than 200 characters"),
  agenda: z.string().max(2000, "Agenda must be less than 2000 characters").optional(),
  platform: z.enum(MEETING_PLATFORMS),
  meetingLink: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  location: z.string().max(300, "Location must be less than 300 characters").optional(),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  timezone: z.string().min(1, "Timezone is required"),
  reminderLeadMinutes: z.number().int().min(0).max(10080).optional(),
  attendeeIds: z.array(z.string().uuid("Invalid attendee")).min(1, "At least one attendee is required"),
  requiredAttendeeIds: z.array(z.string().uuid("Invalid attendee")).optional(),
})

export const createMeetingSchema = meetingBaseSchema.superRefine(checkMeetingTimes)
export type CreateMeetingInput = z.infer<typeof meetingBaseSchema>

export const updateMeetingSchema = meetingBaseSchema
  .extend({ id: z.string().uuid() })
  .superRefine(checkMeetingTimes)
export type UpdateMeetingInput = z.infer<typeof updateMeetingSchema>

export const respondToMeetingSchema = z.object({
  meetingId: z.string().uuid(),
  response: z.enum(["accepted", "declined", "tentative"]),
})

export type RespondToMeetingInput = z.infer<typeof respondToMeetingSchema>

export const cancelMeetingSchema = z.object({
  id: z.string().uuid(),
})

export type CancelMeetingInput = z.infer<typeof cancelMeetingSchema>
