"use client"

import { useEffect, useRef, useState } from "react"
import { Beaker, Clock, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useTestMode } from "@/contexts/test-mode-context"
import { cn } from "@/lib/utils"

const TEST_MODE_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

export function TestModeBanner() {
  const { isTestMode, toggleTestMode, testChanges } = useTestMode()
  const [elapsed, setElapsed] = useState(0)
  const startTimeRef = useRef<number | null>(null)

  // Timer tick + auto-expire (ref tracks start time without causing cascading renders)
  useEffect(() => {
    if (!isTestMode) {
      startTimeRef.current = null
      setElapsed(0)
      return
    }

    if (!startTimeRef.current) {
      startTimeRef.current = Date.now()
    }

    const interval = setInterval(() => {
      const diff = Date.now() - (startTimeRef.current ?? Date.now())
      setElapsed(diff)

      if (diff >= TEST_MODE_TIMEOUT_MS) {
        toggleTestMode()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [isTestMode, toggleTestMode])

  if (!isTestMode) return null

  const remaining = Math.max(0, TEST_MODE_TIMEOUT_MS - elapsed)
  const minutes = Math.floor(remaining / 60000)
  const seconds = Math.floor((remaining % 60000) / 1000)
  const isLow = remaining < 5 * 60 * 1000 // < 5 min

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50",
        "flex items-center justify-between gap-3 px-4 py-2",
        "bg-orange-500 text-white shadow-lg",
        "animate-in slide-in-from-top-2 duration-300"
      )}
    >
      <div className="flex items-center gap-3">
        <Beaker className="h-4 w-4 animate-pulse" />
        <span className="text-sm font-medium">
          Test Mode Active
        </span>
        <Badge
          variant="secondary"
          className={cn(
            "text-xs font-mono",
            isLow && "bg-red-700 text-white animate-pulse"
          )}
        >
          <Clock className="h-3 w-3 mr-1" />
          {minutes}:{seconds.toString().padStart(2, "0")}
        </Badge>
        {testChanges.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {testChanges.length} simulated change{testChanges.length !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleTestMode}
        className="text-white hover:bg-orange-600 h-7 text-xs"
      >
        <X className="h-3 w-3 mr-1" />
        Exit Test Mode
      </Button>
    </div>
  )
}
