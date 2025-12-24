"use client"

/**
 * Google Drive Browser Component
 */

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Loader2,
  Home,
  RefreshCw,
} from "lucide-react"
import { toast } from "sonner"
import type { DriveFolder } from "@/lib/integrations/google-drive"

export interface DriveBrowserProps {
  onSelectFolder: (folder: DriveFolder) => void
  selectedFolderId?: string
}

interface FolderNode extends DriveFolder {
  children?: FolderNode[]
  isLoading?: boolean
  isExpanded?: boolean
}

export function DriveBrowser({
  onSelectFolder,
  selectedFolderId,
}: DriveBrowserProps) {
  const [folders, setFolders] = useState<FolderNode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    loadRootFolders()
  }, [])

  async function loadRootFolders() {
    setIsLoading(true)
    try {
      const response = await fetch("/api/social/drive/folders")
      if (!response.ok) {
        throw new Error("Failed to load folders")
      }
      const data = await response.json()
      setFolders(data.folders.map((f: DriveFolder) => ({ ...f, isExpanded: false })))
    } catch (error) {
      console.error("Load folders error:", error)
      toast.error("Failed to load Google Drive folders")
    } finally {
      setIsLoading(false)
    }
  }

  async function loadSubfolders(parentId: string): Promise<FolderNode[]> {
    const response = await fetch(`/api/social/drive/folders?parentId=${parentId}`)
    if (!response.ok) {
      throw new Error("Failed to load subfolders")
    }
    const data = await response.json()
    return data.folders.map((f: DriveFolder) => ({ ...f, isExpanded: false }))
  }

  async function toggleFolder(folder: FolderNode, path: number[]) {
    const newFolders = [...folders]
    let current: FolderNode[] = newFolders
    let target = folder

    // Navigate to the parent
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]].children || []
    }
    target = current[path[path.length - 1]]

    if (target.isExpanded) {
      target.isExpanded = false
      setFolders(newFolders)
      return
    }

    if (!target.children && target.hasChildren) {
      target.isLoading = true
      setFolders([...newFolders])

      try {
        const children = await loadSubfolders(target.id)
        target.children = children
      } catch (error) {
        console.error("Load subfolders error:", error)
        toast.error("Failed to load subfolders")
      }
      target.isLoading = false
    }

    target.isExpanded = true
    setFolders([...newFolders])
  }

  function handleFolderClick(folder: FolderNode, path: number[]) {
    onSelectFolder(folder)

    // Update breadcrumbs
    const newBreadcrumbs: { id: string; name: string }[] = []
    let current: FolderNode[] = folders
    for (let i = 0; i < path.length; i++) {
      const f = current[path[i]]
      newBreadcrumbs.push({ id: f.id, name: f.name })
      current = f.children || []
    }
    setBreadcrumbs(newBreadcrumbs)
  }

  function renderFolder(folder: FolderNode, path: number[], depth: number = 0) {
    const isSelected = folder.id === selectedFolderId
    const hasChildren = folder.hasChildren || (folder.children && folder.children.length > 0)

    return (
      <div key={folder.id}>
        <div
          className={`flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer hover:bg-muted/50 ${
            isSelected ? "bg-primary/10 text-primary" : ""
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => handleFolderClick(folder, path)}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleFolder(folder, path)
              }}
              className="p-0.5 hover:bg-muted rounded"
            >
              {folder.isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : folder.isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <span className="w-5" />
          )}
          {folder.isExpanded ? (
            <FolderOpen className="h-4 w-4 text-amber-500" />
          ) : (
            <Folder className="h-4 w-4 text-amber-500" />
          )}
          <span className="text-sm truncate">{folder.name}</span>
        </div>

        {folder.isExpanded && folder.children && (
          <div>
            {folder.children.map((child, index) =>
              renderFolder(child, [...path, index], depth + 1)
            )}
          </div>
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Home className="h-4 w-4" />
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.id} className="flex items-center">
              <ChevronRight className="h-3 w-3 mx-1" />
              <span className={i === breadcrumbs.length - 1 ? "text-foreground" : ""}>
                {crumb.name}
              </span>
            </span>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={loadRootFolders}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="h-64 border rounded-lg p-2">
        {folders.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No folders found
          </div>
        ) : (
          <div>
            {folders.map((folder, index) => renderFolder(folder, [index], 0))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
