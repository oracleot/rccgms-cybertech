"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Youtube, Facebook, Sparkles, ThumbsUp, MessageCircle, Share2, Eye } from "lucide-react"
import type { Platform } from "@/lib/validations/livestream"
import { FormattedText } from "./formatted-text"

interface StreamingPreviewProps {
  content: string
  platform: Platform
  title?: string
  isLoading?: boolean
  error?: Error | null
}

export function StreamingPreview({
  content,
  platform,
  title,
  isLoading,
  error,
}: StreamingPreviewProps) {
  const Icon = platform === "youtube" ? Youtube : Facebook
  const platformName = platform === "youtube" ? "YouTube" : "Facebook"

  if (platform === "youtube") {
    return (
      <Card className="flex h-full flex-col overflow-hidden">
        <CardHeader className="border-b bg-zinc-950 pt-6">
          <CardTitle className="flex items-center gap-2 text-lg text-white">
            <Youtube className="h-5 w-5 text-red-500" />
            YouTube Preview
            {isLoading && (
              <Sparkles className="ml-auto h-4 w-4 animate-pulse text-red-400" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto bg-zinc-950 p-0">
          {error ? (
            <div className="flex h-full items-center justify-center p-4 text-center">
              <div className="space-y-2">
                <p className="text-red-400">Failed to generate description</p>
                <p className="text-sm text-zinc-400">{error.message}</p>
              </div>
            </div>
          ) : isLoading && !content ? (
            <div className="space-y-3 p-4">
              <Skeleton className="h-5 w-3/4 bg-zinc-800" />
              <Skeleton className="h-4 w-1/2 bg-zinc-800" />
              <Separator className="my-3 bg-zinc-800" />
              <Skeleton className="h-4 w-full bg-zinc-800" />
              <Skeleton className="h-4 w-11/12 bg-zinc-800" />
              <Skeleton className="h-4 w-10/12 bg-zinc-800" />
            </div>
          ) : content || title ? (
            <div className="p-4">
              {/* YouTube Video Title */}
              <h2 className="text-lg font-semibold text-white leading-tight">
                {title || "Untitled Video"}
              </h2>
              
              {/* YouTube Meta Row */}
              <div className="mt-2 flex items-center gap-4 text-sm text-zinc-400">
                <span className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  0 views
                </span>
                <span>Just now</span>
              </div>

              {/* YouTube Action Buttons */}
              <div className="mt-3 flex items-center gap-6 border-b border-zinc-800 pb-3">
                <button className="flex items-center gap-1.5 text-sm text-zinc-300 hover:text-white">
                  <ThumbsUp className="h-4 w-4" />
                  Like
                </button>
                <button className="flex items-center gap-1.5 text-sm text-zinc-300 hover:text-white">
                  <Share2 className="h-4 w-4" />
                  Share
                </button>
              </div>

              {/* YouTube Description */}
              <div className="mt-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Description
                </p>
                <div className="rounded-lg bg-zinc-900 p-3 text-sm text-zinc-300">
                  {content ? (
                    <FormattedText content={content} />
                  ) : (
                    <span className="text-zinc-500 italic">
                      Description will appear here...
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center p-4 text-center">
              <div className="space-y-2">
                <Youtube className="mx-auto h-10 w-10 text-red-500/30" />
                <p className="text-sm text-zinc-500">
                  Fill in the service details and click "Generate" to create a YouTube description
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Facebook Preview
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <CardHeader className="border-b bg-[#1877F2]/10 pt-6">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Facebook className="h-5 w-5 text-[#1877F2]" />
          Facebook Preview
          {isLoading && (
            <Sparkles className="ml-auto h-4 w-4 animate-pulse text-[#1877F2]" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto bg-gray-50 p-0 dark:bg-zinc-900">
        {error ? (
          <div className="flex h-full items-center justify-center p-4 text-center">
            <div className="space-y-2">
              <p className="text-destructive">Failed to generate description</p>
              <p className="text-sm text-muted-foreground">{error.message}</p>
            </div>
          </div>
        ) : isLoading && !content ? (
          <div className="m-3 space-y-3 rounded-lg bg-white p-4 shadow-sm dark:bg-zinc-800">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-10/12" />
          </div>
        ) : content || title ? (
          <div className="m-3 rounded-lg bg-white shadow-sm dark:bg-zinc-800">
            {/* Facebook Post Header */}
            <div className="flex items-center gap-3 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#1877F2] to-[#0D47A1]">
                <span className="text-sm font-bold text-white">MS</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  RCCG Morning Star
                </p>
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                  Just now · 🌍 Public
                </p>
              </div>
            </div>

            {/* Facebook Post Title */}
            {title && (
              <div className="px-3 pb-2">
                <p className="font-semibold text-gray-900 dark:text-white">
                  🎥 {title}
                </p>
              </div>
            )}

            {/* Facebook Post Content */}
            <div className="px-3 pb-3">
              <div className="text-sm text-gray-800 dark:text-zinc-200">
                {content ? (
                  <FormattedText content={content} />
                ) : (
                  <span className="text-gray-400 dark:text-zinc-500 italic">
                    Post content will appear here...
                  </span>
                )}
              </div>
            </div>

            {/* Facebook Engagement Row */}
            <div className="border-t border-gray-100 px-3 py-2 dark:border-zinc-700">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-zinc-400">
                <span>❤️ 👍 0</span>
                <span>0 Comments · 0 Shares</span>
              </div>
            </div>

            {/* Facebook Action Buttons */}
            <div className="flex border-t border-gray-100 dark:border-zinc-700">
              <button className="flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:text-zinc-300 dark:hover:bg-zinc-700">
                <ThumbsUp className="h-4 w-4" />
                Like
              </button>
              <button className="flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:text-zinc-300 dark:hover:bg-zinc-700">
                <MessageCircle className="h-4 w-4" />
                Comment
              </button>
              <button className="flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:text-zinc-300 dark:hover:bg-zinc-700">
                <Share2 className="h-4 w-4" />
                Share
              </button>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center p-4 text-center">
            <div className="space-y-2">
              <Facebook className="mx-auto h-10 w-10 text-[#1877F2]/30" />
              <p className="text-sm text-muted-foreground">
                Fill in the service details and click "Generate" to create a Facebook post
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
