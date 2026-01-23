"use client"

/**
 * Platform Preview Component for Social Posts
 * Features device mockups (iPhone, Android, Laptop) for realistic preview
 * 
 * Note: Using <img> instead of next/image because media comes from external
 * Google Drive URLs with dynamic origins that can't be pre-configured.
 */

/* eslint-disable @next/next/no-img-element -- Google Drive URLs with dynamic origins */

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  Wifi,
  Battery,
  Signal,
} from "lucide-react"
import type { SocialPlatform } from "@/types/social"

export type DeviceType = "iphone" | "android"

interface PlatformPreviewProps {
  content: string
  mediaUrls?: string[]
  platforms: SocialPlatform[]
  churchName?: string
  churchAvatar?: string
  device?: DeviceType
}

const platformLimits: Record<SocialPlatform, number> = {
  facebook: 2000,
  instagram: 2200,
  youtube: 5000,
}

/** iPhone mockup wrapper component */
function IPhoneMockup({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-center py-4">
      <div className="relative">
        {/* Phone frame */}
        <div className="relative w-[280px] h-[580px] bg-black rounded-[40px] p-2 shadow-xl">
          {/* Side buttons */}
          <div className="absolute -left-[3px] top-24 w-[3px] h-8 bg-gray-700 rounded-l-sm" />
          <div className="absolute -left-[3px] top-36 w-[3px] h-12 bg-gray-700 rounded-l-sm" />
          <div className="absolute -left-[3px] top-52 w-[3px] h-12 bg-gray-700 rounded-l-sm" />
          <div className="absolute -right-[3px] top-32 w-[3px] h-16 bg-gray-700 rounded-r-sm" />
          
          {/* Screen */}
          <div className="relative w-full h-full bg-white dark:bg-gray-900 rounded-[32px] overflow-hidden">
            {/* Notch / Dynamic Island */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20">
              <div className="w-[90px] h-[25px] bg-black rounded-b-2xl flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gray-800 ring-1 ring-gray-700" />
              </div>
            </div>
            
            {/* Status bar */}
            <div className="absolute top-0 left-0 right-0 z-10 px-6 pt-1 flex items-center justify-between text-[10px] font-medium">
              <span className="w-12 text-left">9:41</span>
              <div className="flex-1" />
              <div className="flex items-center gap-1 w-12 justify-end">
                <Signal className="h-3 w-3" />
                <Wifi className="h-3 w-3" />
                <Battery className="h-3.5 w-3.5" />
              </div>
            </div>
            
            {/* Content area */}
            <div className="h-full pt-8 pb-6 overflow-y-auto scrollbar-hide">
              {children}
            </div>
            
            {/* Home indicator */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-28 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  )
}

/** Android phone mockup wrapper component */
function AndroidMockup({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-center py-4">
      <div className="relative">
        {/* Phone frame - more rectangular with thinner bezels */}
        <div className="relative w-[280px] h-[580px] bg-gray-800 rounded-[24px] p-1.5 shadow-xl">
          {/* Side buttons */}
          <div className="absolute -right-[3px] top-24 w-[3px] h-12 bg-gray-600 rounded-r-sm" />
          <div className="absolute -left-[3px] top-28 w-[3px] h-16 bg-gray-600 rounded-l-sm" />
          
          {/* Screen */}
          <div className="relative w-full h-full bg-white dark:bg-gray-900 rounded-[20px] overflow-hidden">
            {/* Punch-hole camera */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20">
              <div className="w-3 h-3 bg-black rounded-full" />
            </div>
            
            {/* Status bar */}
            <div className="absolute top-0 left-0 right-0 z-10 px-4 pt-1.5 flex items-center justify-between text-[10px] font-medium">
              <span className="w-12 text-left">12:30</span>
              <div className="flex-1" />
              <div className="flex items-center gap-1.5 w-16 justify-end">
                <Signal className="h-3 w-3" />
                <Wifi className="h-3 w-3" />
                <span className="text-[9px]">85%</span>
                <Battery className="h-3.5 w-3.5" />
              </div>
            </div>
            
            {/* Content area */}
            <div className="h-full pt-7 pb-4 overflow-y-auto scrollbar-hide">
              {children}
            </div>
            
            {/* Navigation bar */}
            <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex items-center gap-8">
              <div className="w-4 h-4 border-2 border-gray-400 dark:border-gray-500 rounded-sm" />
              <div className="w-4 h-4 rounded-full border-2 border-gray-400 dark:border-gray-500" />
              <div className="w-0 h-0 border-l-[8px] border-l-gray-400 dark:border-l-gray-500 border-y-[6px] border-y-transparent" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Device wrapper that selects the appropriate mockup */
function DeviceMockup({ device, children }: { device: DeviceType; children: React.ReactNode }) {
  switch (device) {
    case "android":
      return <AndroidMockup>{children}</AndroidMockup>
    case "iphone":
    default:
      return <IPhoneMockup>{children}</IPhoneMockup>
  }
}

export function PlatformPreview({
  content,
  mediaUrls = [],
  platforms,
  churchName = "RCCG Morning Star",
  churchAvatar,
  device = "iphone",
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
          <DeviceMockup device={device}>
            <FacebookPreview
              content={content}
              mediaUrls={mediaUrls}
              churchName={churchName}
              churchAvatar={churchAvatar}
              formatContent={formatContent}
              warnings={getWarnings(content, "facebook")}
            />
          </DeviceMockup>
        </TabsContent>
      )}

      {platforms.includes("instagram") && (
        <TabsContent value="instagram">
          <DeviceMockup device={device}>
            <InstagramPreview
              content={content}
              mediaUrls={mediaUrls}
              churchName={churchName}
              churchAvatar={churchAvatar}
              formatContent={formatContent}
              warnings={getWarnings(content, "instagram")}
            />
          </DeviceMockup>
        </TabsContent>
      )}

      {platforms.includes("youtube") && (
        <TabsContent value="youtube">
          <DeviceMockup device={device}>
            <YouTubePreview
              content={content}
              mediaUrls={mediaUrls}
              churchName={churchName}
              churchAvatar={churchAvatar}
              formatContent={formatContent}
              warnings={getWarnings(content, "youtube")}
            />
          </DeviceMockup>
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
    <div className="bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="p-2.5 flex items-center gap-2">
        <Avatar className="h-9 w-9">
          <AvatarImage src={churchAvatar} />
          <AvatarFallback className="bg-blue-500 text-white text-xs">MS</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold text-xs text-blue-600">{churchName}</p>
          <p className="text-[10px] text-muted-foreground">Just now · 🌐</p>
        </div>
        <MoreHorizontal className="h-4 w-4 text-muted-foreground ml-auto" />
      </div>

      {/* Content */}
      <div className="px-2.5 pb-2">
        <p className="text-xs whitespace-pre-wrap leading-relaxed">{formatContent(content)}</p>
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
      <div className="px-2.5 py-2 border-t flex items-center justify-around text-muted-foreground">
        <button className="flex items-center gap-1 text-[10px] hover:text-blue-600">
          <ThumbsUp className="h-3.5 w-3.5" /> Like
        </button>
        <button className="flex items-center gap-1 text-[10px] hover:text-blue-600">
          <MessageCircle className="h-3.5 w-3.5" /> Comment
        </button>
        <button className="flex items-center gap-1 text-[10px] hover:text-blue-600">
          <Share2 className="h-3.5 w-3.5" /> Share
        </button>
      </div>

      {warnings.length > 0 && (
        <div className="px-2.5 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-[10px]">
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
    <div className="bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="p-2.5 flex items-center gap-2">
        <div className="p-0.5 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 rounded-full">
          <Avatar className="h-7 w-7 border-2 border-white dark:border-gray-900">
            <AvatarImage src={churchAvatar} />
            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-[10px]">
              MS
            </AvatarFallback>
          </Avatar>
        </div>
        <span className="font-semibold text-xs">{churchName.toLowerCase().replace(/\s/g, "")}</span>
        <MoreHorizontal className="h-4 w-4 text-muted-foreground ml-auto" />
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
        <div className="aspect-square bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white text-xs">
          No image selected
        </div>
      )}

      {/* Actions */}
      <div className="px-2.5 py-2 flex items-center gap-2.5">
        <Heart className="h-5 w-5" />
        <MessageCircle className="h-5 w-5" />
        <Send className="h-5 w-5" />
        <Bookmark className="h-5 w-5 ml-auto" />
      </div>

      {/* Content */}
      <div className="px-2.5 pb-2.5">
        <p className="text-xs leading-relaxed">
          <span className="font-semibold mr-1">
            {churchName.toLowerCase().replace(/\s/g, "")}
          </span>
          {formatContent(content)}
        </p>
      </div>

      {warnings.length > 0 && (
        <div className="px-2.5 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-[10px]">
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
    <div className="bg-white dark:bg-[#0f0f0f]">
      {/* Video thumbnail */}
      {mediaUrls.length > 0 ? (
        <div className="aspect-video bg-black relative">
          <img
            src={mediaUrls[0]}
            alt="Video thumbnail"
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-1.5 right-1.5 bg-black/80 text-white text-[10px] px-1 rounded">
            1:23:45
          </div>
        </div>
      ) : (
        <div className="aspect-video bg-black flex items-center justify-center">
          <Youtube className="h-12 w-12 text-red-600" />
        </div>
      )}

      {/* Info */}
      <div className="p-2.5 flex gap-2.5">
        <Avatar className="h-8 w-8">
          <AvatarImage src={churchAvatar} />
          <AvatarFallback className="bg-red-600 text-white text-[10px]">MS</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-xs line-clamp-2 leading-tight">
            {content.split("\n")[0] || "Sunday Service Highlights"}
          </h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {churchName} · 123 views · 1 hour ago
          </p>
        </div>
        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Description preview */}
      <div className="px-2.5 pb-2.5">
        <p className="text-[10px] text-muted-foreground line-clamp-3 leading-relaxed">
          {formatContent(content)}
        </p>
      </div>

      {warnings.length > 0 && (
        <div className="px-2.5 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-[10px]">
          {warnings.map((w, i) => (
            <p key={i}>⚠️ {w}</p>
          ))}
        </div>
      )}
    </div>
  )
}
