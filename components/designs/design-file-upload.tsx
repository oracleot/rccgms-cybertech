"use client"

import { useState, useRef, useCallback } from "react"
import { Upload, X, Loader2, ImageIcon, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import type { DeliverableFile } from "@/lib/validations/designs"

interface DesignFileUploadProps {
  requestId: string
  uploaderId: string
  existingFiles?: DeliverableFile[]
  onFilesChange: (files: DeliverableFile[]) => void
  maxFiles?: number
  disabled?: boolean
}

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"]
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export function DesignFileUpload({
  requestId,
  uploaderId,
  existingFiles = [],
  onFilesChange,
  maxFiles = 5,
  disabled = false,
}: DesignFileUploadProps) {
  const [files, setFiles] = useState<DeliverableFile[]>(existingFiles)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const uploadFiles = useCallback(
    async (selectedFiles: FileList | File[]) => {
      setError(null)
      const fileArray = Array.from(selectedFiles)

      // Validate count
      if (files.length + fileArray.length > maxFiles) {
        setError(`Maximum ${maxFiles} files allowed. You have ${files.length} already.`)
        return
      }

      // Validate each file
      for (const file of fileArray) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          setError(`"${file.name}" is not an accepted format. Use PNG, JPG, SVG, or WebP.`)
          return
        }
        if (file.size > MAX_FILE_SIZE) {
          setError(`"${file.name}" exceeds the 10MB limit.`)
          return
        }
      }

      setIsUploading(true)

      try {
        const supabase = createClient()
        const newFiles: DeliverableFile[] = []

        for (const file of fileArray) {
          const timestamp = Date.now()
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
          const storagePath = `${requestId}/${uploaderId}/${timestamp}_${safeName}`

          const { error: uploadError } = await supabase.storage
            .from("design-files")
            .upload(storagePath, file, {
              cacheControl: "3600",
              upsert: false,
            })

          if (uploadError) {
            throw new Error(`Failed to upload "${file.name}": ${uploadError.message}`)
          }

          newFiles.push({
            name: file.name,
            path: storagePath,
            size: file.size,
            uploadedBy: uploaderId,
            uploadedAt: new Date().toISOString(),
          })
        }

        const updated = [...files, ...newFiles]
        setFiles(updated)
        onFilesChange(updated)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed")
      } finally {
        setIsUploading(false)
      }
    },
    [files, maxFiles, requestId, uploaderId, onFilesChange]
  )

  const removeFile = useCallback(
    async (index: number) => {
      const file = files[index]
      try {
        const supabase = createClient()
        await supabase.storage.from("design-files").remove([file.path])
      } catch {
        // Best effort removal from storage
      }
      const updated = files.filter((_, i) => i !== index)
      setFiles(updated)
      onFilesChange(updated)
    },
    [files, onFilesChange]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragActive(false)
      if (disabled || isUploading) return
      if (e.dataTransfer.files.length > 0) {
        uploadFiles(e.dataTransfer.files)
      }
    },
    [disabled, isUploading, uploadFiles]
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled && !isUploading) setDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }

  const getPublicUrl = (path: string) => {
    const supabase = createClient()
    const { data } = supabase.storage.from("design-files").getPublicUrl(path)
    return data.publicUrl
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      {files.length < maxFiles && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !disabled && !isUploading && inputRef.current?.click()}
          className={cn(
            "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors cursor-pointer",
            dragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50",
            (disabled || isUploading) && "opacity-50 cursor-not-allowed"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            multiple
            onChange={(e) => e.target.files && uploadFiles(e.target.files)}
            className="hidden"
            disabled={disabled || isUploading}
          />

          {isUploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">
                Drop files here or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PNG, JPG, SVG, WebP — max 10MB each, up to {maxFiles} files
              </p>
            </>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={file.path}
              className="flex items-center gap-3 rounded-md border p-2 bg-muted/30"
            >
              {/* Thumbnail */}
              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0">
                {file.path.match(/\.(png|jpg|jpeg|webp)$/i) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={getPublicUrl(file.path)}
                    alt={file.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                )}
              </div>

              {/* File info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(0)} KB
                </p>
              </div>

              {/* Remove button */}
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  className="h-8 w-8 p-0 shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
