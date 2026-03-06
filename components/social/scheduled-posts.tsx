"use client"

/**
 * Scheduled Posts List Component
 * 
 * Note: Using <img> instead of next/image because media comes from external
 * Google Drive URLs with dynamic origins that can't be pre-configured.
 */

/* eslint-disable @next/next/no-img-element -- Google Drive URLs with dynamic origins */

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Loader2,
  MoreVertical,
  Edit,
  Trash2,
  Clock,
  ImageIcon,
  FileText,
  Facebook,
  Instagram,
  Youtube,
} from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { SocialPost, SocialPlatform, PostStatus } from "@/types/social"

// Helper to safely get media_urls as string array
function getMediaUrls(post: SocialPost): string[] {
  if (!post.media_urls) return []
  if (Array.isArray(post.media_urls)) {
    return post.media_urls.filter((url): url is string => typeof url === "string")
  }
  return []
}

// Helper to safely get platforms as string array
function getPlatforms(post: SocialPost): SocialPlatform[] {
  if (!post.platforms) return []
  if (Array.isArray(post.platforms)) {
    return post.platforms.filter((p): p is SocialPlatform =>
      ["facebook", "instagram", "youtube"].includes(p as string)
    )
  }
  return []
}

interface ScheduledPostsProps {
  status?: PostStatus | "all"
}

const platformIcons: Record<SocialPlatform, React.ReactNode> = {
  facebook: <Facebook className="h-3.5 w-3.5" />,
  instagram: <Instagram className="h-3.5 w-3.5" />,
  youtube: <Youtube className="h-3.5 w-3.5" />,
}

const statusColors: Record<PostStatus, string> = {
  draft: "bg-slate-500",
  scheduled: "bg-blue-500",
  published: "bg-green-500",
  failed: "bg-red-500",
}

export function ScheduledPosts({ status = "all" }: ScheduledPostsProps) {
  const router = useRouter()
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  async function fetchPosts() {
    try {
      const params = new URLSearchParams()
      if (status !== "all") {
        params.set("status", status)
      }
      const response = await fetch(`/api/social/content?${params.toString()}`)
      if (!response.ok) throw new Error("Failed to fetch posts")
      const data = await response.json()
      setPosts(data.posts || [])
    } catch (error) {
      console.error("Fetch posts error:", error)
      toast.error("Failed to load posts")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPosts()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchPosts is stable, only re-fetch when status changes
  }, [status])

  async function handleDelete(id: string) {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/social/content/${id}`, {
        method: "DELETE",
      })
      if (!response.ok) throw new Error("Failed to delete post")
      setPosts((prev) => prev.filter((p) => p.id !== id))
      toast.success("Post deleted")
    } catch (error) {
      console.error("Delete error:", error)
      toast.error("Failed to delete post")
    } finally {
      setIsDeleting(false)
      setDeleteId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No posts yet</p>
          <p className="text-sm text-muted-foreground">
            Create your first post to get started
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="grid gap-4">
        {posts.map((post) => (
          <Card key={post.id}>
            <CardContent className="p-4">
              <div className="flex gap-4">
                {/* Thumbnail */}
                <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-muted">
                  {getMediaUrls(post).length > 0 ? (
                    <img
                      src={getMediaUrls(post)[0]}
                      alt="Post thumbnail"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm line-clamp-2">{post.content}</p>
                      
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {/* Status badge */}
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-white text-xs",
                            statusColors[post.status]
                          )}
                        >
                          {post.status}
                        </Badge>

                        {/* Platform badges */}
                        <div className="flex gap-1">
                          {getPlatforms(post).map((platform) => (
                            <div
                              key={platform}
                              className="p-1 rounded bg-muted"
                              title={platform}
                            >
                              {platformIcons[platform]}
                            </div>
                          ))}
                        </div>

                        {/* Scheduled time */}
                        {post.scheduled_for && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {format(new Date(post.scheduled_for), "MMM d, h:mm a")}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => router.push(`/social/edit/${post.id}`)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteId(post.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDelete(deleteId)}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
