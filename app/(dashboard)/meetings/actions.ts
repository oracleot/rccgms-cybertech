"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { getCurrentProfile } from "@/lib/auth/profile"
import {
  createMeetingSchema,
  updateMeetingSchema,
  respondToMeetingSchema,
  cancelMeetingSchema,
  type CreateMeetingInput,
  type UpdateMeetingInput,
  type RespondToMeetingInput,
} from "@/lib/validations/meeting"
import {
  notifyMeetingInvited,
  notifyMeetingUpdated,
  notifyMeetingCancelled,
} from "@/lib/notifications/meeting-notifications"

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

const MANAGER_ROLES = ["admin", "lead_developer", "leader"]

async function requireManager() {
  const profile = await getCurrentProfile()
  if (!profile) return { ok: false as const, error: "Unauthorized" }
  if (!MANAGER_ROLES.includes(profile.role)) {
    return { ok: false as const, error: "Only admins, lead developers, and leaders can manage meetings" }
  }
  return { ok: true as const, profile }
}

/**
 * Create a new meeting and invite its attendees.
 */
export async function createMeeting(input: CreateMeetingInput): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = createMeetingSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    const guard = await requireManager()
    if (!guard.ok) return { success: false, error: guard.error }

    const supabase = await createClient()
    const data = parsed.data
    const requiredSet = new Set(data.requiredAttendeeIds || data.attendeeIds)

    const { data: meetingRow, error: insertError } = await supabase
      .from("meetings")
      .insert({
        title: data.title,
        agenda: data.agenda || null,
        platform: data.platform,
        meeting_link: data.meetingLink || null,
        location: data.location || null,
        start_time: data.startTime,
        end_time: data.endTime,
        timezone: data.timezone,
        reminder_lead_minutes: data.reminderLeadMinutes ?? 60,
        created_by: guard.profile.id,
      })
      .select("id")
      .single()

    if (insertError || !meetingRow) {
      console.error("Error creating meeting:", insertError)
      return { success: false, error: "Failed to create meeting" }
    }

    const attendeeRows = data.attendeeIds.map((userId) => ({
      meeting_id: meetingRow.id,
      user_id: userId,
      is_required: requiredSet.has(userId),
    }))

    const { error: attendeesError } = await supabase.from("meeting_attendees").insert(attendeeRows)
    if (attendeesError) {
      console.error("Error inviting attendees:", attendeesError)
      return { success: false, error: "Meeting created, but failed to invite attendees" }
    }

    try {
      await notifyMeetingInvited(meetingRow.id, data.attendeeIds)
    } catch (error) {
      console.error("Failed to send invite notifications:", error)
    }

    revalidatePath("/meetings")
    revalidatePath("/dashboard")
    return { success: true, data: { id: meetingRow.id } }
  } catch (error) {
    console.error("Error in createMeeting:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

/**
 * Update a meeting. Reconciles the attendee list rather than replacing it
 * wholesale, so existing RSVPs survive an edit that only changes, say,
 * the time.
 */
export async function updateMeeting(input: UpdateMeetingInput): Promise<ActionResult> {
  try {
    const parsed = updateMeetingSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    const guard = await requireManager()
    if (!guard.ok) return { success: false, error: guard.error }

    const supabase = await createClient()
    const data = parsed.data

    const { data: existing, error: existingError } = await supabase
      .from("meetings")
      .select("start_time, end_time, reminder_lead_minutes")
      .eq("id", data.id)
      .single()

    if (existingError || !existing) {
      return { success: false, error: "Meeting not found" }
    }

    const { data: existingAttendees, error: existingAttendeesError } = await supabase
      .from("meeting_attendees")
      .select("user_id")
      .eq("meeting_id", data.id)

    if (existingAttendeesError) {
      console.error("Error reading existing attendees:", existingAttendeesError)
      return { success: false, error: "Failed to load existing attendees" }
    }

    const existingIds = new Set((existingAttendees || []).map((a) => a.user_id))
    const newIds = new Set(data.attendeeIds)
    const requiredSet = new Set(data.requiredAttendeeIds || data.attendeeIds)

    const toAdd = data.attendeeIds.filter((id) => !existingIds.has(id))
    const toRemove = [...existingIds].filter((id) => !newIds.has(id))
    const toKeep = data.attendeeIds.filter((id) => existingIds.has(id))

    // Reschedule detection - clears the reminder marker so a fresh
    // reminder goes out for the new time rather than none at all.
    const rescheduled =
      existing.start_time !== data.startTime ||
      existing.end_time !== data.endTime ||
      existing.reminder_lead_minutes !== (data.reminderLeadMinutes ?? 60)

    const { error: updateError } = await supabase
      .from("meetings")
      .update({
        title: data.title,
        agenda: data.agenda || null,
        platform: data.platform,
        meeting_link: data.meetingLink || null,
        location: data.location || null,
        start_time: data.startTime,
        end_time: data.endTime,
        timezone: data.timezone,
        reminder_lead_minutes: data.reminderLeadMinutes ?? 60,
        ...(rescheduled ? { reminder_sent_at: null } : {}),
      })
      .eq("id", data.id)

    if (updateError) {
      console.error("Error updating meeting:", updateError)
      return { success: false, error: "Failed to update meeting" }
    }

    if (toRemove.length > 0) {
      const { error: removeError } = await supabase
        .from("meeting_attendees")
        .delete()
        .eq("meeting_id", data.id)
        .in("user_id", toRemove)

      if (removeError) console.error("Error removing attendees:", removeError)
    }

    if (toAdd.length > 0) {
      const { error: addError } = await supabase.from("meeting_attendees").insert(
        toAdd.map((userId) => ({
          meeting_id: data.id,
          user_id: userId,
          is_required: requiredSet.has(userId),
        }))
      )
      if (addError) console.error("Error adding attendees:", addError)
    }

    // Keep required/optional flags in sync for retained attendees too.
    for (const userId of toKeep) {
      await supabase
        .from("meeting_attendees")
        .update({ is_required: requiredSet.has(userId) })
        .eq("meeting_id", data.id)
        .eq("user_id", userId)
    }

    try {
      if (toAdd.length > 0) await notifyMeetingInvited(data.id, toAdd)
      if (toKeep.length > 0) await notifyMeetingUpdated(data.id, toKeep)
    } catch (error) {
      console.error("Failed to send update notifications:", error)
    }

    revalidatePath("/meetings")
    revalidatePath(`/meetings/${data.id}`)
    revalidatePath("/dashboard")
    return { success: true, data: undefined }
  } catch (error) {
    console.error("Error in updateMeeting:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

/**
 * Cancel a meeting. The row is kept (marked cancelled) rather than
 * deleted, so attendees can still see what happened and a re-downloaded
 * .ics carries the RFC 5545 CANCEL method to withdraw it from their
 * calendar app.
 */
export async function cancelMeeting(input: { id: string }): Promise<ActionResult> {
  try {
    const parsed = cancelMeetingSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    const guard = await requireManager()
    if (!guard.ok) return { success: false, error: guard.error }

    const supabase = await createClient()

    const { data: attendees } = await supabase
      .from("meeting_attendees")
      .select("user_id")
      .eq("meeting_id", parsed.data.id)

    const { error } = await supabase
      .from("meetings")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", parsed.data.id)

    if (error) {
      console.error("Error cancelling meeting:", error)
      return { success: false, error: "Failed to cancel meeting" }
    }

    try {
      await notifyMeetingCancelled(
        parsed.data.id,
        (attendees || []).map((a) => a.user_id)
      )
    } catch (notifyError) {
      console.error("Failed to send cancellation notifications:", notifyError)
    }

    revalidatePath("/meetings")
    revalidatePath(`/meetings/${parsed.data.id}`)
    revalidatePath("/dashboard")
    return { success: true, data: undefined }
  } catch (error) {
    console.error("Error in cancelMeeting:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

/**
 * Permanently delete a meeting (e.g. created by mistake). For a meeting
 * that already happened or was communicated, prefer `cancelMeeting`.
 */
export async function deleteMeeting(id: string): Promise<ActionResult> {
  try {
    if (!id) return { success: false, error: "Meeting ID is required" }

    const guard = await requireManager()
    if (!guard.ok) return { success: false, error: guard.error }

    const supabase = await createClient()
    const { error } = await supabase.from("meetings").delete().eq("id", id)

    if (error) {
      console.error("Error deleting meeting:", error)
      return { success: false, error: "Failed to delete meeting" }
    }

    revalidatePath("/meetings")
    revalidatePath("/dashboard")
    return { success: true, data: undefined }
  } catch (error) {
    console.error("Error in deleteMeeting:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}

/**
 * RSVP to a meeting. This is the one write an ordinary attendee (any
 * role) can make - everything else in this file is manager-only.
 */
export async function respondToMeeting(input: RespondToMeetingInput): Promise<ActionResult> {
  try {
    const parsed = respondToMeetingSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    const profile = await getCurrentProfile()
    if (!profile) return { success: false, error: "Unauthorized" }

    const supabase = await createClient()
    const { error } = await supabase
      .from("meeting_attendees")
      .update({
        response: parsed.data.response,
        responded_at: new Date().toISOString(),
      })
      .eq("meeting_id", parsed.data.meetingId)
      .eq("user_id", profile.id)

    if (error) {
      console.error("Error responding to meeting:", error)
      return { success: false, error: "Failed to save your response" }
    }

    revalidatePath("/meetings")
    revalidatePath(`/meetings/${parsed.data.meetingId}`)
    return { success: true, data: undefined }
  } catch (error) {
    console.error("Error in respondToMeeting:", error)
    return { success: false, error: "An unexpected error occurred" }
  }
}
