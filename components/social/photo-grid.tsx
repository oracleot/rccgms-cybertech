"use client"

/**
 * Photo Grid Component for Social Media Hub
 */

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ImageIcon,
  Video,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
} from "lucide-react"
import type { DriveFile } from "@/lib/integrations/google-drive"

export interface PhotoGridProps {
  folderId: string | null
  selectedFiles: DriveFile[]
  onSelectFile: (file: DriveFile) => void
  maxSelection?: number
}

export function PhotoGrid({
  folderId,
  selectedFiles,
  onSelectFile,
  maxSelection = 10,
}: PhotoGridProps) {
  const [files, setFiles] = useState<DriveFile[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [nextPageToken, setNextPageToken] = useState<string | null>(null)
  const [previewFile, setPreviewFile] = useState<DriveFile | null>(null)
  const [previewIndex, setPreviewIndex] = useState(0)

  useEffect(() => {
    if (folderId) {
      loadFiles(folderId)
    } else {
      setFiles([])
    }
  }, [folderId])

  async function loadFiles(id: string, pageToken?: string) {
    setIsLoading(true)
    try {
      let url = `/api/social/drive/files?folderId=${id}`
      if (pageToken) {
        url += `&pageToken=${pageToken}`
      }

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error("Failed to load files")
      }

      const data = await response.json()
      if (pageToken) {
        setFiles((prev) => [...prev, ...data.files])
      } else {
        setFiles(data.files)
      }
      setNextPageToken(data.nextPageToken)
    } catch (error) {
      console.error("Load files error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  function toggleFileSelection(file: DriveFile) {
    onSelectFile(file)
  }

  function clearSelection() {
    selectedFiles.forEach((file) => onSelectFile(file))
  }

  function isFileSelected(file: DriveFile): boolean {
    return selectedFiles.some((f) => f.id === file.id)
  }

  function openPreview(file: DriveFile) {
    const index = files.findIndex((f) => f.id === file.id)
    setPreviewIndex(index)
    setPreviewFile(file)
  }

  function navigatePreview(direction: "prev" | "next") {
    const newIndex =
      direction === "prev"
        ? Math.max(0, previewIndex - 1)
        : Math.min(files.length - 1, previewIndex + 1)
    setPreviewIndex(newIndex)
    setPreviewFile(files[newIndex])
  }

  function isVideo(mimeType: string): boolean {
    return mimeType.startsWith("video/")
  }

  if (!folderId) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg text-muted-foreground">
        <ImageIcon className="h-12 w-12 mb-2 opacity-50" />
        <p>Select a folder to view photos</p>
      </div>
    )
  }

  if (isLoading && files.length === 0) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
    )
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg text-muted-foreground">
        <ImageIcon className="h-12 w-12 mb-2 opacity-50" />
        <p>No photos or videos in this folder</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {selectedFiles.length > 0 && (
        <div className="flex items-center justify-between p-2 bg-primary/10 rounded-lg">
          <span className="text-sm font-medium">
            {selectedFiles.length} of {maxSelection} selected
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSelection}
          >
            Clear selection
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {files.map((file) => {
          const selected = isFileSelected(file)
          return (
            <div
              key={file.id}
              className={`relative group aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                selected
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-transparent hover:border-muted-foreground/20"
              }`}
            >
              {/* Thumbnail */}
              <div
                className="absolute inset-0 bg-muted"
                onClick={() => openPreview(file)}
              >
                {file.thumbnailUrl ? (
                  <img
                    src={file.thumbnailUrl}
                    alt={file.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {isVideo(file.mimeType) ? (
                      <Video className="h-8 w-8 text-muted-foreground" />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                )}
              </div>

              {/* Video indicator */}
              {isVideo(file.mimeType) && (
                <div className="absolute top-1 right-1">
                  <Badge variant="secondary" className="text-xs">
                    <Video className="h-3 w-3 mr-1" />
                    Video
                  </Badge>
                </div>
              )}

              {/* Selection checkbox */}
              <div
                className={`absolute top-1 left-1 ${
                  selected || "opacity-0 group-hover:opacity-100"
                } transition-opacity`}
                onClick={(e) => {
                  e.stopPropagation()
                  toggleFileSelection(file)
                }}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    selected
                      ? "bg-primary text-primary-foreground"
                      : "bg-white/80 border border-gray-300"
                  }`}
                >
                  {selected && <Check className="h-4 w-4" />}
                </div>
              </div>

              {/* File name on hover */}
              <div className="absolute bottom-0 left-0 right-0 p-1 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-xs text-white truncate">{file.name}</p>
              </div>
            </div>
          )
        })}
      </div>

      {nextPageToken && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => folderId && loadFiles(folderId, nextPageToken)}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Load more
          </Button>
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <DialogTitle className="sr-only">
            {previewFile?.name || "Preview"}
          </DialogTitle>
          <div className="relative bg-black min-h-[60vh] flex items-center justify-center">
            {previewFile && (
              <>
                {isVideo(previewFile.mimeType) ? (
                  <div className="text-white text-center p-8">
                    <Video className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p>Video preview not available</p>
                    <p className="text-sm text-gray-400">{previewFile.name}</p>
                  </div>
                ) : previewFile.thumbnailUrl ? (
                  <img
                    src={previewFile.thumbnailUrl.replace("=s220", "=s800")}
                    alt={previewFile.name}
                    className="max-h-[70vh] max-w-full object-contain"
                  />
                ) : (
                  <ImageIcon className="h-16 w-16 text-gray-500" />
                )}

                {/* Navigation buttons */}
                {previewIndex > 0 && (
                  <button
                    onClick={() => navigatePreview("prev")}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                )}
                {previewIndex < files.length - 1 && (
                  <button
                    onClick={() => navigatePreview("next")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                )}

                {/* Close button */}
                <button
                  onClick={() => setPreviewFile(null)}
                  className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
                >
                  <X className="h-5 w-5" />
                </button>
              </>
            )}
          </div>

          {/* Footer with file info and selection */}
          {previewFile && (
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{previewFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(previewFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                onClick={() => {
                  toggleFileSelection(previewFile)
                  setPreviewFile(null)
                }}
                disabled={
                  !isFileSelected(previewFile) &&
                  selectedFiles.length >= maxSelection
                }
              >
                {isFileSelected(previewFile) ? (
                  <>
                    <X className="h-4 w-4 mr-2" />
                    Remove from selection
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Select
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
