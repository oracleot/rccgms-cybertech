"use client"

/**
 * Content Calendar Client Component
 * Displays scheduled posts in a calendar view with filtering options.
 */

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft,
  Loader2,
  Clock,
  Facebook,
  Instagram,
  Youtube,
  Twitter,
  ImageIcon,
} from "lucide-react"
import { format, isSameDay, startOfMonth, endOfMonth } from "date-fns"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { SocialPost, SocialPlatform, PostStatus } from "@/types/social"

const platformIcons: Record<SocialPlatform, React.ReactNode> = {
  facebook: <Facebook className="h-3.5 w-3.5" />,
  instagram: <Instagram className="h-3.5 w-3.5" />,
  youtube: <Youtube className="h-3.5 w-3.5" />,
  twitter: <Twitter className="h-3.5 w-3.5" />,
}

const statusColors: Record<PostStatus, string> = {
  draft: "bg-slate-500",
  scheduled: "bg-blue-500",
  published: "bg-green-500",
  failed: "bg-red-500",
}

export function ContentCalendarClient() {
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
  const [statusFilter, setStatusFilter] = useState<string>("all")

  async function fetchPosts() {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") {
        params.set("status", statusFilter)
      }
      // Fetch posts for the current month
      const start = startOfMonth(currentMonth)
      const end = endOfMonth(currentMonth)
      params.set("from", start.toISOString())
      params.set("to", end.toISOString())

      const response = await fetch(`/api/social/content?${params.toString()}`)
      if (!response.ok) throw new Error("Failed to fetch posts")
      const data = await response.json()
      setPosts(data.posts || [])
    } catch (error) {
      console.error("Fetch posts error:", error)
      toast.error("Failed to load calendar")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [currentMonth, statusFilter])

  // Get posts for a specific date
  function getPostsForDate(date: Date): SocialPost[] {
    return posts.filter((post) => {
      if (!post.scheduled_for) return false
      return isSameDay(new Date(post.scheduled_for), date)
    })
  }

  // Helper to safely get media_urls as string array
  function getMediaUrls(post: SocialPost): string[] {
    if (!post.media_urls) return []
    if (Array.isArray(post.media_urls)) {
      return post.media_urls.filter((url): url is string => typeof url === "string")
    }
    return []
  }

  // Get posts for the selected date
  const selectedDatePosts = getPostsForDate(selectedDate)

  // Custom day render to show dots for dates with posts
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/social">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Content Calendar</h1>
            <p className="text-muted-foreground">
              View and manage your scheduled posts
            </p>
          </div>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Drafts</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{format(currentMonth, "MMMM yyyy")}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                className="rounded-md"
                modifiers={{
                  hasPost: posts
                    .filter((p) => p.scheduled_for)
                    .map((p) => new Date(p.scheduled_for!)),
                }}
                modifiersClassNames={{
                  hasPost: "bg-primary/20 font-semibold",
                }}
              />
            )}
          </CardContent>
        </Card>

        {/* Selected date posts */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{format(selectedDate, "EEEE, MMMM d")}</CardTitle>
              <CardDescription>
                {selectedDatePosts.length} post{selectedDatePosts.length !== 1 ? "s" : ""} scheduled
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedDatePosts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No posts scheduled for this date
                </p>
              ) : (
                selectedDatePosts.map((post) => {
                  const mediaUrls = getMediaUrls(post)
                  return (
                  <Link
                    key={post.id}
                    href={`/social/edit/${post.id}`}
                    className="block"
                  >
                    <div className="flex gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      {/* Thumbnail */}
                      <div className="flex-shrink-0 w-12 h-12 rounded overflow-hidden bg-muted">
                        {mediaUrls.length > 0 ? (
                          <img
                            src={mediaUrls[0]}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm line-clamp-1">{post.content}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-white text-xs",
                              statusColors[post.status]
                            )}
                          >
                            {post.status}
                          </Badge>
                          <div className="flex gap-1">
                            {(post.platforms as string[] || []).map((platform) => (
                              <span key={platform} className="text-muted-foreground">
                                {platformIcons[platform as SocialPlatform]}
                              </span>
                            ))}
                          </div>
                          {post.scheduled_for && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(post.scheduled_for), "h:mm a")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                )})
              )}
            </CardContent>
          </Card>

          <Link href="/social">
            <Button className="w-full">
              Create New Post
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
