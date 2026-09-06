"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AttendeeSelector } from "@/components/meetings/attendee-selector"
import { createMeeting, updateMeeting } from "@/app/(dashboard)/meetings/actions"
import { zonedToUtc, utcToZoned, COMMON_TIMEZONES } from "@/lib/calendar"
import { isRemotePlatform, PLATFORM_LABELS } from "@/lib/meetings/platforms"
import type { MeetingPlatform, SuggestedMeetingDate } from "@/types/meeting"

const REMINDER_OPTIONS = [
  { value: 15, label: "15 minutes before" },
  { value: 30, label: "30 minutes before" },
  { value: 60, label: "1 hour before" },
  { value: 1440, label: "1 day before" },
]

export interface MeetingFormValues {
  id?: string
  title: string
  agenda: string
  platform: MeetingPlatform
  meetingLink: string
  location: string
  date: string
  startTime: string
  endTime: string
  timezone: string
  reminderLeadMinutes: number
  attendeeIds: string[]
  requiredAttendeeIds: string[]
}

interface MeetingFormProps {
  initial?: Partial<MeetingFormValues>
  mode: "create" | "edit"
}

const DEFAULT_TIMEZONE = "Europe/London"

function defaultValues(initial?: Partial<MeetingFormValues>): MeetingFormValues {
  return {
    id: initial?.id,
    title: initial?.title ?? "",
    agenda: initial?.agenda ?? "",
    platform: initial?.platform ?? "zoom",
    meetingLink: initial?.meetingLink ?? "",
    location: initial?.location ?? "",
    date: initial?.date ?? "",
    startTime: initial?.startTime ?? "10:00",
    endTime: initial?.endTime ?? "11:00",
    timezone: initial?.timezone ?? DEFAULT_TIMEZONE,
    reminderLeadMinutes: initial?.reminderLeadMinutes ?? 60,
    attendeeIds: initial?.attendeeIds ?? [],
    requiredAttendeeIds: initial?.requiredAttendeeIds ?? [],
  }
}

/**
 * Converts a stored UTC ISO timestamp back into form-friendly date/time
 * strings in the meeting's own timezone. Exported for the edit page.
 */
export function isoToFormFields(iso: string, timezone: string): { date: string; time: string } {
  return utcToZoned(new Date(iso), timezone)
}

export function MeetingForm({ initial, mode }: MeetingFormProps) {
  const router = useRouter()
  const [values, setValues] = useState<MeetingFormValues>(() => defaultValues(initial))
  const [isPending, startTransition] = useTransition()
  const [isSuggesting, setIsSuggesting] = useState(false)
  const [suggestions, setSuggestions] = useState<SuggestedMeetingDate[]>([])
  const [error, setError] = useState<string | null>(null)

  const remote = isRemotePlatform(values.platform)

  function set<K extends keyof MeetingFormValues>(key: K, value: MeetingFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  const canSuggest = values.attendeeIds.length > 0

  async function suggestDates() {
    if (!canSuggest) {
      toast.error("Select attendees first")
      return
    }
    setIsSuggesting(true)
    setSuggestions([])
    try {
      const params = new URLSearchParams({
        userIds: values.attendeeIds.join(","),
        days: "21",
      })
      const res = await fetch(`/api/rota/overlap?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Failed to load suggestions")
        return
      }
      setSuggestions(data.suggestions || [])
      if ((data.suggestions || []).length === 0) {
        toast.info("No dates with enough submitted availability yet")
      }
    } catch {
      toast.error("Failed to load suggestions")
    } finally {
      setIsSuggesting(false)
    }
  }

  const startIso = useMemo(() => {
    if (!values.date || !values.startTime) return null
    try {
      return zonedToUtc(values.date, values.startTime, values.timezone).toISOString()
    } catch {
      return null
    }
  }, [values.date, values.startTime, values.timezone])

  const endIso = useMemo(() => {
    if (!values.date || !values.endTime) return null
    try {
      return zonedToUtc(values.date, values.endTime, values.timezone).toISOString()
    } catch {
      return null
    }
  }, [values.date, values.endTime, values.timezone])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!values.title.trim()) {
      setError("Title is required")
      return
    }
    if (!startIso || !endIso) {
      setError("Please choose a valid date and time")
      return
    }
    if (values.attendeeIds.length === 0) {
      setError("Please invite at least one attendee")
      return
    }

    const payload = {
      title: values.title,
      agenda: values.agenda || undefined,
      platform: values.platform,
      meetingLink: remote ? values.meetingLink || undefined : undefined,
      location: !remote ? values.location || undefined : undefined,
      startTime: startIso,
      endTime: endIso,
      timezone: values.timezone,
      reminderLeadMinutes: values.reminderLeadMinutes,
      attendeeIds: values.attendeeIds,
      requiredAttendeeIds: values.requiredAttendeeIds,
    }

    startTransition(async () => {
      const result =
        mode === "edit" && values.id
          ? await updateMeeting({ ...payload, id: values.id })
          : await createMeeting(payload)

      if (!result.success) {
        setError(result.error)
        return
      }

      toast.success(mode === "edit" ? "Meeting updated" : "Meeting created")
      const id = mode === "edit" ? values.id! : (result.data as { id: string }).id
      router.push(`/meetings/${id}`)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="meeting-title">Title</Label>
            <Input
              id="meeting-title"
              value={values.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Media Team Planning"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="meeting-agenda">Agenda (optional)</Label>
            <Textarea
              id="meeting-agenda"
              value={values.agenda}
              onChange={(e) => set("agenda", e.target.value)}
              rows={3}
              placeholder="What's this meeting about?"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select value={values.platform} onValueChange={(v) => set("platform", v as MeetingPlatform)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PLATFORM_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {remote ? (
              <div className="space-y-2">
                <Label htmlFor="meeting-link">Meeting link</Label>
                <Input
                  id="meeting-link"
                  type="url"
                  value={values.meetingLink}
                  onChange={(e) => set("meetingLink", e.target.value)}
                  placeholder="https://..."
                  required
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="meeting-location">Location</Label>
                <Input
                  id="meeting-location"
                  value={values.location}
                  onChange={(e) => set("location", e.target.value)}
                  placeholder="e.g. Kirknewton Community Centre"
                />
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="meeting-date">Date</Label>
              <Input
                id="meeting-date"
                type="date"
                value={values.date}
                onChange={(e) => set("date", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meeting-start">Start time</Label>
              <Input
                id="meeting-start"
                type="time"
                value={values.startTime}
                onChange={(e) => set("startTime", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meeting-end">End time</Label>
              <Input
                id="meeting-end"
                type="time"
                value={values.endTime}
                onChange={(e) => set("endTime", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select value={values.timezone} onValueChange={(v) => set("timezone", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reminder</Label>
              <Select
                value={String(values.reminderLeadMinutes)}
                onValueChange={(v) => set("reminderLeadMinutes", Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REMINDER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-6">
          <div className="flex items-center justify-between">
            <Label>Attendees</Label>
            <Button type="button" variant="outline" size="sm" onClick={suggestDates} disabled={isSuggesting}>
              {isSuggesting ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="mr-1 h-3.5 w-3.5" />
              )}
              Dates that suit the team
            </Button>
          </div>

          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-2 rounded-lg border bg-muted/30 p-3">
              {suggestions.map((s) => (
                <button
                  key={s.date}
                  type="button"
                  onClick={() => set("date", s.date)}
                  className="rounded-md border bg-background px-2.5 py-1 text-xs hover:border-violet-500 hover:text-violet-600"
                >
                  {s.date} · {s.freeCount}/{s.totalConsidered} free
                </button>
              ))}
            </div>
          )}

          <AttendeeSelector
            selectedIds={values.attendeeIds}
            requiredIds={values.requiredAttendeeIds}
            onChange={(ids, required) => {
              set("attendeeIds", ids)
              set("requiredAttendeeIds", required)
            }}
            date={values.date || undefined}
          />
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === "edit" ? "Save changes" : "Create meeting"}
        </Button>
      </div>
    </form>
  )
}
