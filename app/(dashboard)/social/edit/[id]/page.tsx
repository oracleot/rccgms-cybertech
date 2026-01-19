"use client"

/**
 * Edit Social Post Page
 */

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Save,
  Loader2,
  Clock,
  X,
  Smartphone,
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import { PlatformPreview, type DeviceType } from "@/components/social/platform-preview"
import type { SocialPost, SocialPlatform } from "@/types/social"

const platforms: { value: SocialPlatform; label: string }[] = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "youtube", label: "YouTube" },
]

export default function EditPostPage() {
  const params = useParams()
  const router = useRouter()
  const postId = params.id as string

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [post, setPost] = useState<SocialPost | null>(null)

  const [content, setContent] = useState("")
  const [mediaUrls, setMediaUrls] = useState<string[]>([])
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>([])
  const [scheduleDate, setScheduleDate] = useState<Date>()
  const [scheduleTime, setScheduleTime] = useState("09:00")
  const [isScheduleOpen, setIsScheduleOpen] = useState(false)
  const [device, setDevice] = useState<DeviceType>("iphone")

  useEffect(() => {
    async function fetchPost() {
      try {
        const response = await fetch(`/api/social/content/${postId}`)
        if (!response.ok) throw new Error("Failed to fetch post")
        const data = await response.json()
        const fetchedPost = data.content as SocialPost

        setPost(fetchedPost)
        setContent(fetchedPost.content)
        setMediaUrls(
          Array.isArray(fetchedPost.media_urls)
            ? (fetchedPost.media_urls as string[])
            : []
        )
        setSelectedPlatforms(
          Array.isArray(fetchedPost.platforms)
            ? (fetchedPost.platforms as SocialPlatform[])
            : []
        )

        if (fetchedPost.scheduled_for) {
          const scheduledDate = new Date(fetchedPost.scheduled_for)
          setScheduleDate(scheduledDate)
          setScheduleTime(format(scheduledDate, "HH:mm"))
        }
      } catch (error) {
        console.error("Fetch error:", error)
        toast.error("Failed to load post")
        router.push("/social")
      } finally {
        setIsLoading(false)
      }
    }

    fetchPost()
  }, [postId, router])

  function togglePlatform(platform: SocialPlatform) {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    )
  }

  function removeMedia(url: string) {
    setMediaUrls((prev) => prev.filter((u) => u !== url))
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

      const response = await fetch(`/api/social/content/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          mediaUrls,
          platforms: selectedPlatforms,
          scheduledFor,
          status,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to update")
      }

      toast.success("Post updated successfully!")
      router.push("/social")
    } catch (error) {
      console.error("Save error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to update post")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!post) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Post not found</p>
        <Button variant="link" onClick={() => router.push("/social")}>
          Go back
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Post</h1>
          <p className="text-muted-foreground">Update your social media post</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Post Content</CardTitle>
            <CardDescription>Edit your post details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Media preview */}
            {mediaUrls.length > 0 && (
              <div className="space-y-2">
                <Label>Images</Label>
                <div className="flex gap-2 flex-wrap">
                  {mediaUrls.map((url) => (
                    <div
                      key={url}
                      className="relative w-20 h-20 rounded-lg overflow-hidden border group"
                    >
                      <Image
                        src={url}
                        alt="Media"
                        fill
                        className="object-cover"
                      />
                      <button
                        onClick={() => removeMedia(url)}
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      >
                        <X className="h-5 w-5 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Caption input */}
            <div className="space-y-2">
              <Label htmlFor="content">Caption</Label>
              <Textarea
                id="content"
                placeholder="What would you like to share?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
              />
              <p className="text-xs text-muted-foreground">
                {content.length} characters
              </p>
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

            {/* Current schedule */}
            {post.scheduled_for && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Scheduled for{" "}
                    {format(new Date(post.scheduled_for), "MMM d, yyyy 'at' h:mm a")}
                  </span>
                </div>
              </div>
            )}
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
              Save as Draft
            </Button>

            <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" disabled={isSaving}>
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {post.scheduled_for ? "Reschedule" : "Schedule"}
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
                    Update Schedule
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardFooter>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Preview</CardTitle>
                <CardDescription>How your post will look</CardDescription>
              </div>
              <Select value={device} onValueChange={(v) => setDevice(v as DeviceType)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="iphone">
                    <span className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      iPhone
                    </span>
                  </SelectItem>
                  <SelectItem value="android">
                    <span className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      Android
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {selectedPlatforms.length > 0 ? (
              <PlatformPreview
                content={content || "Your caption will appear here..."}
                mediaUrls={mediaUrls}
                platforms={selectedPlatforms}
                device={device}
              />
            ) : (
              <div className="border rounded-lg p-8 bg-muted/50 text-center text-muted-foreground">
                Select at least one platform to see preview
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
