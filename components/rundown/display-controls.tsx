"use client"

import { useCallback, useState } from "react"
import {
  Monitor,
  MonitorUp,
  Maximize2,
  Wifi,
  WifiOff,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface DisplayControlsProps {
  rundownId: string
  isDisplayConnected: boolean
  displayCount: number
}

// Type for Window Management API (Chrome-only)
interface ScreenDetails {
  screens: Array<{
    availHeight: number
    availWidth: number
    availLeft: number
    availTop: number
    label: string
    isPrimary: boolean
  }>
  currentScreen: {
    label: string
    isPrimary: boolean
  }
}

declare global {
  interface Window {
    getScreenDetails?: () => Promise<ScreenDetails>
  }
}

/**
 * Controls for opening and managing the extended display window
 */
export function DisplayControls({
  rundownId,
  isDisplayConnected,
  displayCount,
}: DisplayControlsProps) {
  const [displayWindow, setDisplayWindow] = useState<Window | null>(null)
  const [screens, setScreens] = useState<ScreenDetails["screens"]>([])
  const [hasMultiScreenSupport, setHasMultiScreenSupport] = useState(false)
  const [_isRequestingScreens, setIsRequestingScreens] = useState(false)

  // Check for multi-screen support and request screen details
  const checkScreenSupport = useCallback(async () => {
    if (typeof window === "undefined") return

    // Check for Window Management API (Chrome 100+)
    if ("getScreenDetails" in window) {
      setHasMultiScreenSupport(true)

      try {
        setIsRequestingScreens(true)
        const screenDetails = await window.getScreenDetails!()
        setScreens(screenDetails.screens)
      } catch (error) {
        // Permission denied or not supported
        console.log("Screen details not available:", error)
      } finally {
        setIsRequestingScreens(false)
      }
    }
  }, [])

  // Open display in a new window
  const openDisplay = useCallback(
    (screenIndex?: number) => {
      // Add autoFullscreen query param if specific screen selected
      const autoFullscreen = screenIndex !== undefined && screens[screenIndex]
      const displayUrl = `/rundown/${rundownId}/display${autoFullscreen ? '?autoFullscreen=true' : ''}`

      // Determine window features
      let features = "popup=yes,menubar=no,toolbar=no,location=no,status=no"

      // If a specific screen is selected, position the window there
      if (screenIndex !== undefined && screens[screenIndex]) {
        const screen = screens[screenIndex]
        features += `,left=${screen.availLeft},top=${screen.availTop},width=${screen.availWidth},height=${screen.availHeight}`
      } else {
        // Default: open at reasonable size
        const width = 1280
        const height = 720
        const left = window.screen.availWidth / 2 - width / 2
        const top = window.screen.availHeight / 2 - height / 2
        features += `,left=${left},top=${top},width=${width},height=${height}`
      }

      const win = window.open(displayUrl, "rundown-display", features)

      if (win) {
        setDisplayWindow(win)

        // Track when window closes
        const checkClosed = setInterval(() => {
          if (win.closed) {
            setDisplayWindow(null)
            clearInterval(checkClosed)
          }
        }, 1000)
      }
    },
    [rundownId, screens]
  )

  // Enter fullscreen on the display window
  const enterFullscreen = useCallback(() => {
    if (displayWindow && !displayWindow.closed) {
      try {
        displayWindow.document.documentElement.requestFullscreen?.()
      } catch (error) {
        console.error("Failed to enter fullscreen:", error)
      }
    }
  }, [displayWindow])

  // Close the display window
  const _closeDisplay = useCallback(() => {
    if (displayWindow && !displayWindow.closed) {
      displayWindow.close()
      setDisplayWindow(null)
    }
  }, [displayWindow])

  // Focus the display window
  const focusDisplay = useCallback(() => {
    if (displayWindow && !displayWindow.closed) {
      displayWindow.focus()
    }
  }, [displayWindow])

  return (
    <div className="flex items-center gap-2">
      {/* Connection status indicator */}
      <Badge
        variant={isDisplayConnected ? "default" : "secondary"}
        className={cn(
          "gap-1.5 transition-colors",
          isDisplayConnected && "bg-green-500/15 text-green-600 hover:bg-green-500/20"
        )}
      >
        {isDisplayConnected ? (
          <>
            <Wifi className="h-3 w-3" />
            {displayCount > 1 ? `${displayCount} displays` : "Display connected"}
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3" />
            No display
          </>
        )}
      </Badge>

      {/* Display controls dropdown */}
      {hasMultiScreenSupport && screens.length > 1 ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" onClick={checkScreenSupport}>
              <MonitorUp className="mr-2 h-4 w-4" />
              Open Display
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Select Screen</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {screens.map((screen, index) => (
              <DropdownMenuItem
                key={index}
                onClick={() => openDisplay(index)}
                className="gap-2"
              >
                <Monitor className="h-4 w-4" />
                <span>{screen.label || `Screen ${index + 1}`}</span>
                {screen.isPrimary && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    Primary
                  </Badge>
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => openDisplay()} className="gap-2">
              <Monitor className="h-4 w-4" />
              <span>Default window</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => openDisplay()}
          onMouseEnter={checkScreenSupport}
        >
          <MonitorUp className="mr-2 h-4 w-4" />
          Open Display
        </Button>
      )}

      {/* Active display controls */}
      {displayWindow && !displayWindow.closed && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={focusDisplay}
            title="Focus display window"
          >
            <Monitor className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={enterFullscreen}
            title="Enter fullscreen"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  )
}
