"use client"

/**
 * Platform Preview Component for Social Posts
 */

import { useMemo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  ThumbsUp,
  MessageCircle,
  Share2,
  Heart,
  Send,
  Bookmark,
  Youtube,
  MoreHorizontal,
} from "lucide-react"
import type { SocialPlatform } from "@/types/social"

interface PlatformPreviewProps {
  content: string
  mediaUrls?: string[]
  platforms: SocialPlatform[]
  churchName?: string
  churchAvatar?: string
}

const platformLimits: Record<SocialPlatform, number> = {
  facebook: 2000,
  instagram: 2200,
  youtube: 5000,
}

export function PlatformPreview({
  content,
  mediaUrls = [],
  platforms,
  churchName = "RCCG Morning Star",
  churchAvatar,
}: PlatformPreviewProps) {
  const defaultTab = platforms[0] || "facebook"

  function formatContent(text: string): React.ReactNode {
    // Split by hashtags and format them
    const parts = text.split(/(#\w+)/g)
    return parts.map((part, i) => {
      if (part.startsWith("#")) {
        return (
          <span key={i} className="text-blue-500">
            {part}
          </span>
        )
      }
      return part
    })
  }

  function getWarnings(text: string, platform: SocialPlatform): string[] {
    const warnings: string[] = []
    const limit = platformLimits[platform]

    if (text.length > limit) {
      warnings.push(
        `Caption exceeds ${platform} limit of ${limit} characters (${text.length})`
      )
    }

    if (platform === "instagram" && !text.includes("#")) {
      warnings.push("Consider adding hashtags for better reach")
    }

    return warnings
  }

  return (
    <Tabs defaultValue={defaultTab} className="w-full">
      <TabsList className="grid" style={{ gridTemplateColumns: `repeat(${platforms.length}, 1fr)` }}>
        {platforms.includes("facebook") && (
          <TabsTrigger value="facebook">Facebook</TabsTrigger>
        )}
        {platforms.includes("instagram") && (
          <TabsTrigger value="instagram">Instagram</TabsTrigger>
        )}
        {platforms.includes("youtube") && (
          <TabsTrigger value="youtube">YouTube</TabsTrigger>
        )}
      </TabsList>

      {platforms.includes("facebook") && (
        <TabsContent value="facebook">
          <FacebookPreview
            content={content}
            mediaUrls={mediaUrls}
            churchName={churchName}
            churchAvatar={churchAvatar}
            formatContent={formatContent}
            warnings={getWarnings(content, "facebook")}
          />
        </TabsContent>
      )}

      {platforms.includes("instagram") && (
        <TabsContent value="instagram">
          <InstagramPreview
            content={content}
            mediaUrls={mediaUrls}
            churchName={churchName}
            churchAvatar={churchAvatar}
            formatContent={formatContent}
            warnings={getWarnings(content, "instagram")}
          />
        </TabsContent>
      )}

      {platforms.includes("youtube") && (
        <TabsContent value="youtube">
          <YouTubePreview
            content={content}
            mediaUrls={mediaUrls}
            churchName={churchName}
            churchAvatar={churchAvatar}
            formatContent={formatContent}
            warnings={getWarnings(content, "youtube")}
          />
        </TabsContent>
      )}
    </Tabs>
  )
}

interface PreviewProps {
  content: string
  mediaUrls: string[]
  churchName: string
  churchAvatar?: string
  formatContent: (text: string) => React.ReactNode
  warnings: string[]
}

function FacebookPreview({
  content,
  mediaUrls,
  churchName,
  churchAvatar,
  formatContent,
  warnings,
}: PreviewProps) {
  return (
    <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="p-3 flex items-center gap-2">
        <Avatar className="h-10 w-10">
          <AvatarImage src={churchAvatar} />
          <AvatarFallback className="bg-blue-500 text-white">MS</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold text-sm text-blue-600">{churchName}</p>
          <p className="text-xs text-muted-foreground">Just now · 🌐</p>
        </div>
        <MoreHorizontal className="h-5 w-5 text-muted-foreground ml-auto" />
      </div>

      {/* Content */}
      <div className="px-3 pb-2">
        <p className="text-sm whitespace-pre-wrap">{formatContent(content)}</p>
      </div>

      {/* Media */}
      {mediaUrls.length > 0 && (
        <div className="aspect-video bg-muted flex items-center justify-center">
          <img
            src={mediaUrls[0]}
            alt="Post media"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Actions */}
      <div className="px-3 py-2 border-t flex items-center justify-around text-muted-foreground">
        <button className="flex items-center gap-1 text-sm hover:text-blue-600">
          <ThumbsUp className="h-4 w-4" /> Like
        </button>
        <button className="flex items-center gap-1 text-sm hover:text-blue-600">
          <MessageCircle className="h-4 w-4" /> Comment
        </button>
        <button className="flex items-center gap-1 text-sm hover:text-blue-600">
          <Share2 className="h-4 w-4" /> Share
        </button>
      </div>

      {warnings.length > 0 && (
        <div className="px-3 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs">
          {warnings.map((w, i) => (
            <p key={i}>⚠️ {w}</p>
          ))}
        </div>
      )}
    </div>
  )
}

function InstagramPreview({
  content,
  mediaUrls,
  churchName,
  churchAvatar,
  formatContent,
  warnings,
}: PreviewProps) {
  return (
    <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="p-3 flex items-center gap-2">
        <div className="p-0.5 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 rounded-full">
          <Avatar className="h-8 w-8 border-2 border-white dark:border-gray-900">
            <AvatarImage src={churchAvatar} />
            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs">
              MS
            </AvatarFallback>
          </Avatar>
        </div>
        <span className="font-semibold text-sm">{churchName.toLowerCase().replace(/\s/g, "")}</span>
        <MoreHorizontal className="h-5 w-5 text-muted-foreground ml-auto" />
      </div>

      {/* Media */}
      {mediaUrls.length > 0 ? (
        <div className="aspect-square bg-muted">
          <img
            src={mediaUrls[0]}
            alt="Post media"
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="aspect-square bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white">
          No image selected
        </div>
      )}

      {/* Actions */}
      <div className="px-3 py-2 flex items-center gap-3">
        <Heart className="h-6 w-6" />
        <MessageCircle className="h-6 w-6" />
        <Send className="h-6 w-6" />
        <Bookmark className="h-6 w-6 ml-auto" />
      </div>

      {/* Content */}
      <div className="px-3 pb-3">
        <p className="text-sm">
          <span className="font-semibold mr-1">
            {churchName.toLowerCase().replace(/\s/g, "")}
          </span>
          {formatContent(content)}
        </p>
      </div>

      {warnings.length > 0 && (
        <div className="px-3 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs">
          {warnings.map((w, i) => (
            <p key={i}>⚠️ {w}</p>
          ))}
        </div>
      )}
    </div>
  )
}

function YouTubePreview({
  content,
  mediaUrls,
  churchName,
  churchAvatar,
  formatContent,
  warnings,
}: PreviewProps) {
  return (
    <div className="border rounded-lg overflow-hidden bg-white dark:bg-[#0f0f0f]">
      {/* Video thumbnail */}
      {mediaUrls.length > 0 ? (
        <div className="aspect-video bg-black relative">
          <img
            src={mediaUrls[0]}
            alt="Video thumbnail"
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1 rounded">
            1:23:45
          </div>
        </div>
      ) : (
        <div className="aspect-video bg-black flex items-center justify-center">
          <Youtube className="h-16 w-16 text-red-600" />
        </div>
      )}

      {/* Info */}
      <div className="p-3 flex gap-3">
        <Avatar className="h-9 w-9">
          <AvatarImage src={churchAvatar} />
          <AvatarFallback className="bg-red-600 text-white text-xs">MS</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm line-clamp-2">
            {content.split("\n")[0] || "Sunday Service Highlights"}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {churchName} · 123 views · 1 hour ago
          </p>
        </div>
        <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
      </div>

      {/* Description preview */}
      <div className="px-3 pb-3">
        <p className="text-xs text-muted-foreground line-clamp-3">
          {formatContent(content)}
        </p>
      </div>

      {warnings.length > 0 && (
        <div className="px-3 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs">
          {warnings.map((w, i) => (
            <p key={i}>⚠️ {w}</p>
          ))}
        </div>
      )}
    </div>
  )
}
