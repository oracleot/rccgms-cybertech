"use client"

/**
 * Media Uploader Component
 * Drag-and-drop image upload with preview and progress
 */

import { useState, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Upload,
  X,
  ImageIcon,
  AlertCircle,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const MAX_FILES = 3
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]

export interface UploadedMedia {
  url: string
  filename: string
  size: number
}

interface MediaUploaderProps {
  uploadedMedia: UploadedMedia[]
  onMediaChange: (media: UploadedMedia[]) => void
  maxFiles?: number
}

interface UploadingFile {
  id: string
  filename: string
  progress: number
  error?: string
}

export function MediaUploader({
  uploadedMedia,
  onMediaChange,
  maxFiles = MAX_FILES,
}: MediaUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const remainingSlots = maxFiles - uploadedMedia.length - uploadingFiles.length

  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "File must be JPEG, PNG, or WebP"
    }
    if (file.size > MAX_FILE_SIZE) {
      return "File must be less than 5MB"
    }
    return null
  }, [])

  const uploadFile = useCallback(async (file: File) => {
    const uploadId = crypto.randomUUID()
    
    // Add to uploading state
    setUploadingFiles((prev) => [
      ...prev,
      { id: uploadId, filename: file.name, progress: 0 },
    ])

    try {
      const formData = new FormData()
      formData.append("file", file)

      // Simulate progress (actual XHR would provide real progress)
      const progressInterval = setInterval(() => {
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.id === uploadId && f.progress < 90
              ? { ...f, progress: f.progress + 10 }
              : f
          )
        )
      }, 100)

      const response = await fetch("/api/social/upload", {
        method: "POST",
        body: formData,
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || "Upload failed")
      }

      const data = await response.json()

      // Set progress to 100 and add to uploaded
      setUploadingFiles((prev) =>
        prev.map((f) => (f.id === uploadId ? { ...f, progress: 100 } : f))
      )

      // Brief delay to show 100% then remove from uploading
      await new Promise((r) => setTimeout(r, 200))

      setUploadingFiles((prev) => prev.filter((f) => f.id !== uploadId))
      
      onMediaChange([
        ...uploadedMedia,
        { url: data.url, filename: data.filename, size: data.size },
      ])
    } catch (error) {
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.id === uploadId
            ? { ...f, error: error instanceof Error ? error.message : "Upload failed" }
            : f
        )
      )
      
      // Remove error state after 3 seconds
      setTimeout(() => {
        setUploadingFiles((prev) => prev.filter((f) => f.id !== uploadId))
      }, 3000)
    }
  }, [uploadedMedia, onMediaChange])

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files)
      
      if (fileArray.length > remainingSlots) {
        toast.error(`You can only add ${remainingSlots} more image(s)`)
        return
      }

      for (const file of fileArray) {
        const error = validateFile(file)
        if (error) {
          toast.error(`${file.name}: ${error}`)
          continue
        }
        uploadFile(file)
      }
    },
    [remainingSlots, validateFile, uploadFile]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      if (remainingSlots <= 0) {
        toast.error(`Maximum ${maxFiles} images allowed`)
        return
      }

      handleFiles(e.dataTransfer.files)
    },
    [remainingSlots, maxFiles, handleFiles]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleClick = useCallback(() => {
    if (remainingSlots > 0) {
      fileInputRef.current?.click()
    }
  }, [remainingSlots])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(e.target.files)
      }
      // Reset input
      e.target.value = ""
    },
    [handleFiles]
  )

  const handleRemove = useCallback(
    (url: string) => {
      onMediaChange(uploadedMedia.filter((m) => m.url !== url))
    },
    [uploadedMedia, onMediaChange]
  )

  const handleRemoveUploading = useCallback((id: string) => {
    setUploadingFiles((prev) => prev.filter((f) => f.id !== id))
  }, [])

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50",
          remainingSlots <= 0 && "cursor-not-allowed opacity-50"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleInputChange}
          className="hidden"
        />
        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm font-medium">
          {remainingSlots > 0
            ? "Drag & drop images or click to upload"
            : "Maximum images reached"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          JPEG, PNG, WebP up to 5MB • Max {maxFiles} images
        </p>
      </div>

      {/* Uploading files */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((file) => (
            <div
              key={file.id}
              className={cn(
                "flex items-center gap-3 p-2 rounded-lg border",
                file.error ? "border-destructive bg-destructive/5" : "border-border"
              )}
            >
              {file.error ? (
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
              ) : (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{file.filename}</p>
                {file.error ? (
                  <p className="text-xs text-destructive">{file.error}</p>
                ) : (
                  <Progress value={file.progress} className="h-1 mt-1" />
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 flex-shrink-0"
                onClick={() => handleRemoveUploading(file.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Uploaded thumbnails */}
      {uploadedMedia.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {uploadedMedia.map((media) => (
            <div
              key={media.url}
              className="relative w-20 h-20 rounded-lg overflow-hidden border group"
            >
              <img
                src={media.url}
                alt={media.filename}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => handleRemove(media.url)}
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>
          ))}
          {remainingSlots > 0 && (
            <button
              onClick={handleClick}
              className="w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center hover:border-primary/50 transition-colors"
            >
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
