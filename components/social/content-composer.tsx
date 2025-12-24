"use client"

/**
 * Content Composer Component for Social Posts
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Calendar } from "@/components/ui/calendar"
import {
  Calendar as CalendarIcon,
  Save,
  Loader2,
  Clock,
} from "lucide-react"
import { toast } from "sonner"
import { MediaUploader, type UploadedMedia } from "./media-uploader"
import type { SocialPlatform } from "@/types/social"

interface ContentComposerProps {
  uploadedMedia: UploadedMedia[]
  onMediaChange: (media: UploadedMedia[]) => void
  initialCaption?: string
  onCaptionChange?: (caption: string) => void
}

const platforms: { value: SocialPlatform; label: string }[] = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "youtube", label: "YouTube" },
  { value: "twitter", label: "Twitter/X" },
]

export function ContentComposer({
  uploadedMedia,
  onMediaChange,
  initialCaption = "",
  onCaptionChange,
}: ContentComposerProps) {
  const router = useRouter()
  const [content, setContent] = useState(initialCaption)
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>([
    "facebook",
  ])
  const [scheduleDate, setScheduleDate] = useState<Date>()
  const [scheduleTime, setScheduleTime] = useState("09:00")
  const [isScheduleOpen, setIsScheduleOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  function handleContentChange(value: string) {
    setContent(value)
    onCaptionChange?.(value)
  }

  function togglePlatform(platform: SocialPlatform) {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    )
  }

  async function handleSave(status: "draft" | "scheduled") {
    if (!content.trim()) {
      toast.error("Please enter some content")
      return
    }

    if (selectedPlatforms.length === 0) {
      toast.error("Please select at least one platform")
      return
    }

    setIsSaving(true)
    try {
      let scheduledFor: string | undefined

      if (status === "scheduled" && scheduleDate) {
        const [hours, minutes] = scheduleTime.split(":").map(Number)
        const dateTime = new Date(scheduleDate)
        dateTime.setHours(hours, minutes, 0, 0)
        scheduledFor = dateTime.toISOString()
      }

      const response = await fetch("/api/social/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          mediaUrls: uploadedMedia.map((m) => m.url),
          platforms: selectedPlatforms,
          scheduledFor,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save")
      }

      toast.success(
        status === "scheduled"
          ? "Post scheduled successfully!"
          : "Draft saved successfully!"
      )

      // Reset form
      setContent("")
      setSelectedPlatforms(["facebook"])
      setScheduleDate(undefined)
      onMediaChange([])

      // Redirect to calendar
      router.push("/social/calendar")
    } catch (error) {
      console.error("Save error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to save post")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Post</CardTitle>
        <CardDescription>
          Compose your social media content
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Media uploader */}
        <div className="space-y-2">
          <Label>Images</Label>
          <MediaUploader
            uploadedMedia={uploadedMedia}
            onMediaChange={onMediaChange}
            maxFiles={3}
          />
        </div>

        {/* Caption input */}
        <div className="space-y-2">
          <Label htmlFor="content">Caption</Label>
          <Textarea
            id="content"
            placeholder="What would you like to share?"
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            rows={5}
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{content.length} characters</span>
            {content.length > 280 && (
              <span className="text-amber-500">
                Twitter limit exceeded
              </span>
            )}
          </div>
        </div>

        {/* Platform selection */}
        <div className="space-y-2">
          <Label>Platforms</Label>
          <div className="flex flex-wrap gap-3">
            {platforms.map((platform) => (
              <div key={platform.value} className="flex items-center space-x-2">
                <Checkbox
                  id={platform.value}
                  checked={selectedPlatforms.includes(platform.value)}
                  onCheckedChange={() => togglePlatform(platform.value)}
                />
                <label
                  htmlFor={platform.value}
                  className="text-sm font-medium cursor-pointer"
                >
                  {platform.label}
                </label>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => handleSave("draft")}
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Draft
        </Button>

        <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
          <DialogTrigger asChild>
            <Button variant="secondary" disabled={isSaving}>
              <CalendarIcon className="h-4 w-4 mr-2" />
              Schedule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule Post</DialogTitle>
              <DialogDescription>
                Choose when to publish your post
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Calendar
                  mode="single"
                  selected={scheduleDate}
                  onSelect={setScheduleDate}
                  disabled={(date) => date < new Date()}
                  className="rounded-md border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="time"
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-32"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsScheduleOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!scheduleDate) {
                    toast.error("Please select a date")
                    return
                  }
                  setIsScheduleOpen(false)
                  handleSave("scheduled")
                }}
                disabled={!scheduleDate || isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CalendarIcon className="h-4 w-4 mr-2" />
                )}
                Schedule
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  )
}
