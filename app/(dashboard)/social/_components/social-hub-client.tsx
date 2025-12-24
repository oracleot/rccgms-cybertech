"use client"

/**
 * Social Media Hub Client Component
 * Upload images, generate AI captions, preview across platforms, and schedule content.
 */

import { useState } from "react"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { CaptionGenerator } from "@/components/social/caption-generator"
import { PlatformPreview } from "@/components/social/platform-preview"
import { ContentComposer } from "@/components/social/content-composer"
import { ScheduledPosts } from "@/components/social/scheduled-posts"
import type { UploadedMedia } from "@/components/social/media-uploader"

export function SocialHubClient() {
  const [uploadedMedia, setUploadedMedia] = useState<UploadedMedia[]>([])
  const [caption, setCaption] = useState("")
  const [activeTab, setActiveTab] = useState("create")

  function handleCaptionGenerated(newCaption: string) {
    setCaption(newCaption)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Social Media Hub</h1>
        <p className="text-muted-foreground">
          Create and schedule social media content
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="create">Create Post</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="drafts">Drafts</TabsTrigger>
          <TabsTrigger value="published">Published</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left column: Upload and AI caption */}
            <div className="lg:col-span-2 space-y-6">
              {/* Caption generator */}
              <CaptionGenerator
                onCaptionGenerated={handleCaptionGenerated}
                initialContext={
                  uploadedMedia.length > 0
                    ? `Content includes ${uploadedMedia.length} image(s)`
                    : ""
                }
              />

              {/* Platform previews */}
              {caption && (
                <PlatformPreview
                  content={caption}
                  mediaUrls={uploadedMedia.map((m) => m.url)}
                  platforms={["facebook", "instagram", "twitter", "youtube"]}
                />
              )}
            </div>

            {/* Right column: Composer */}
            <div>
              <ContentComposer
                uploadedMedia={uploadedMedia}
                onMediaChange={setUploadedMedia}
                initialCaption={caption}
                onCaptionChange={setCaption}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="scheduled" className="mt-6">
          <ScheduledPosts status="scheduled" />
        </TabsContent>

        <TabsContent value="drafts" className="mt-6">
          <ScheduledPosts status="draft" />
        </TabsContent>

        <TabsContent value="published" className="mt-6">
          <ScheduledPosts status="published" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
