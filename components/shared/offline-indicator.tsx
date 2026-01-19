"use client"

import { useEffect, useState } from "react"
import { WifiOff } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Shows a banner when the user is offline
 * Listens to browser online/offline events
 */
export function OfflineIndicator() {
  // Use lazy initialization to avoid calling setState in useEffect
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof navigator !== "undefined") {
      return navigator.onLine
    }
    return true
  })
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      // Show "back online" briefly then hide
      setShowBanner(true)
      setTimeout(() => setShowBanner(false), 3000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowBanner(true)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Don't show banner if online and banner has been dismissed
  if (isOnline && !showBanner) {
    return null
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-auto",
        "flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg",
        "transition-all duration-300 transform",
        showBanner ? "translate-y-0 opacity-100" : "translate-y-full opacity-0",
        isOnline
          ? "bg-green-500/90 text-white"
          : "bg-amber-500/90 text-white"
      )}
      role="alert"
    >
      {isOnline ? (
        <>
          <span className="text-sm font-medium">Back online</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">
            You&apos;re offline. Some features may be unavailable.
          </span>
        </>
      )}
    </div>
  )
}
