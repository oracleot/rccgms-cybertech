"use client"

/**
 * Google Drive Connect Button Component
 */

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CloudIcon, CheckCircle2, Loader2, ExternalLink } from "lucide-react"
import { toast } from "sonner"

interface DriveConnectProps {
  isConnected: boolean
  accountName?: string | null
  onConnect?: () => void
  onDisconnect?: () => void
  onConnectionChange?: (connected: boolean) => void
}

export function DriveConnect({
  isConnected,
  accountName,
  onConnect,
  onDisconnect,
  onConnectionChange,
}: DriveConnectProps) {
  const [isLoading, setIsLoading] = useState(false)

  async function handleConnect() {
    setIsLoading(true)
    try {
      const response = await fetch("/api/social/connect/google", {
        method: "POST",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to initiate connection")
      }

      const { authUrl } = await response.json()

      // Redirect to Google OAuth
      window.location.href = authUrl
    } catch (error) {
      console.error("Connect error:", error)
      toast.error(
        error instanceof Error ? error.message : "Failed to connect Google Drive"
      )
      setIsLoading(false)
    }
  }

  async function handleDisconnect() {
    if (!confirm("Are you sure you want to disconnect Google Drive?")) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/social/disconnect/google", {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to disconnect")
      }

      toast.success("Google Drive disconnected")
      onDisconnect?.()
      onConnectionChange?.(false)
    } catch (error) {
      console.error("Disconnect error:", error)
      toast.error("Failed to disconnect Google Drive")
    } finally {
      setIsLoading(false)
    }
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-3 p-4 border rounded-lg bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
        <div className="flex-1">
          <p className="font-medium text-green-900 dark:text-green-100">
            Google Drive Connected
          </p>
          {accountName && (
            <p className="text-sm text-green-700 dark:text-green-300">
              {accountName}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDisconnect}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Disconnect"}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 p-4 border rounded-lg">
      <CloudIcon className="h-5 w-5 text-muted-foreground" />
      <div className="flex-1">
        <p className="font-medium">Connect Google Drive</p>
        <p className="text-sm text-muted-foreground">
          Browse and select photos from your Drive
        </p>
      </div>
      <Button onClick={handleConnect} disabled={isLoading}>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <ExternalLink className="h-4 w-4 mr-2" />
        )}
        Connect
      </Button>
    </div>
  )
}
