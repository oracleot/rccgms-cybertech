"use client"

/**
 * Social Media Hub Client Component
 * Integrates all social media functionality: Drive browsing, caption generation,
 * platform previews, and content scheduling.
 */

import { useState, useEffect } from "react"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DriveConnect } from "@/components/social/drive-connect"
import { DriveBrowser } from "@/components/social/drive-browser"
import { PhotoGrid } from "@/components/social/photo-grid"
import { CaptionGenerator } from "@/components/social/caption-generator"
import { PlatformPreview } from "@/components/social/platform-preview"
import { ContentComposer } from "@/components/social/content-composer"
import { ScheduledPosts } from "@/components/social/scheduled-posts"
import type { DriveFile, DriveFolder } from "@/lib/integrations/google-drive"
import type { SocialPlatform } from "@/types/social"

export function SocialHubClient() {
  const [isConnected, setIsConnected] = useState(false)
  const [currentFolder, setCurrentFolder] = useState<DriveFolder | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<DriveFile[]>([])
  const [caption, setCaption] = useState("")
  const [activeTab, setActiveTab] = useState("create")

  // Check connection status on mount
  useEffect(() => {
    checkConnection()
  }, [])

  async function checkConnection() {
    try {
      const response = await fetch("/api/social/drive/folders")
      setIsConnected(response.ok)
    } catch {
      setIsConnected(false)
    }
  }

  function handleSelectFolder(folder: DriveFolder) {
    setCurrentFolder(folder)
  }

  function handleSelectFile(file: DriveFile) {
    setSelectedFiles((prev) => {
      const exists = prev.find((f) => f.id === file.id)
      if (exists) {
        return prev.filter((f) => f.id !== file.id)
      }
      return [...prev, file]
    })
  }

  function handleRemoveFile(fileId: string) {
    setSelectedFiles((prev) => prev.filter((f) => f.id !== fileId))
  }

  function handleClearFiles() {
    setSelectedFiles([])
  }

  function handleCaptionGenerated(newCaption: string) {
    setCaption(newCaption)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Social Media Hub</h1>
          <p className="text-muted-foreground">
            Create and schedule social media content
          </p>
        </div>
        <DriveConnect
          isConnected={isConnected}
          onConnectionChange={setIsConnected}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="create">Create Post</TabsTrigger>
          <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
          <TabsTrigger value="drafts">Drafts</TabsTrigger>
          <TabsTrigger value="published">Published</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="mt-6">
          {!isConnected ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                Connect your Google Drive to browse photos for your social posts.
              </p>
              <DriveConnect
                isConnected={isConnected}
                onConnectionChange={setIsConnected}
              />
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left column: Drive browsing */}
              <div className="lg:col-span-2 space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Folder browser */}
                  <div className="h-[400px] border rounded-lg overflow-hidden">
                    <ScrollArea className="h-full">
                      <DriveBrowser
                        onSelectFolder={handleSelectFolder}
                        selectedFolderId={currentFolder?.id}
                      />
                    </ScrollArea>
                  </div>

                  {/* Photo grid */}
                  <div className="h-[400px] border rounded-lg overflow-hidden">
                    <ScrollArea className="h-full">
                      <PhotoGrid
                        folderId={currentFolder?.id || null}
                        selectedFiles={selectedFiles}
                        onSelectFile={handleSelectFile}
                        maxSelection={10}
                      />
                    </ScrollArea>
                  </div>
                </div>

                {/* Caption generator */}
                <CaptionGenerator
                  onCaptionGenerated={handleCaptionGenerated}
                  initialContext={
                    selectedFiles.length > 0
                      ? `Content includes ${selectedFiles.length} photo(s)/video(s)`
                      : ""
                  }
                />

                {/* Platform previews */}
                {caption && (
                  <PlatformPreview
                    content={caption}
                    mediaUrls={selectedFiles
                      .map((f) => f.thumbnailUrl?.replace("=s220", "=s1000"))
                      .filter(Boolean) as string[]}
                    platforms={["facebook", "instagram", "twitter", "youtube"]}
                  />
                )}
              </div>

              {/* Right column: Composer */}
              <div>
                <ContentComposer
                  selectedFiles={selectedFiles}
                  onRemoveFile={handleRemoveFile}
                  onClearFiles={handleClearFiles}
                />
              </div>
            </div>
          )}
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
