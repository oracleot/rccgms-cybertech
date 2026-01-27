"use client"

/**
 * Timer component for rundown live view
 * Uses Date.now() for accurate elapsed time tracking
 */

/* eslint-disable react-hooks/purity -- uses Date.now() for real-time elapsed tracking */

import { useEffect, useRef, useState } from "react"
import { Pause, Play, RotateCcw, Timer, FastForward, Rewind } from "lucide-react"

import { formatDuration } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface RundownTimerProps {
  durationSeconds?: number
  autoStart?: boolean
  onTick?: (seconds: number) => void
}

// Timer control constants
const TIME_SKIP_SECONDS = 15 // Seconds to skip when rewinding or fast-forwarding
const OVERTIME_BUFFER_SECONDS = 300 // Allow 5 minutes over the scheduled time

export function RundownTimer({ durationSeconds, autoStart = false, onTick }: RundownTimerProps) {
  // Track the autoStart value we last processed to detect changes
  const lastAutoStartRef = useRef(autoStart)
  const [isRunning, setIsRunning] = useState(autoStart)
  const [elapsed, setElapsed] = useState(0)
  const onTickRef = useRef(onTick)
  const startTimeRef = useRef<number | null>(autoStart ? Date.now() : null)
  const pausedElapsedRef = useRef<number>(0)

  // Keep onTick ref up to date without triggering effect
  useEffect(() => {
    onTickRef.current = onTick
  }, [onTick])

  // Handle autoStart changes using a ref comparison to avoid setState in effect
  if (autoStart !== lastAutoStartRef.current) {
    lastAutoStartRef.current = autoStart
    if (!autoStart) {
      if (isRunning) setIsRunning(false)
      if (elapsed !== 0) setElapsed(0)
      startTimeRef.current = null
      pausedElapsedRef.current = 0
      // Defer callback to avoid updating parent during render
      setTimeout(() => onTickRef.current?.(0), 0)
    } else {
      if (!isRunning) setIsRunning(true)
      startTimeRef.current = Date.now()
      pausedElapsedRef.current = 0
    }
  }

  // Use timestamp-based timing to work correctly even when tab is inactive
  useEffect(() => {
    if (!isRunning) return

    // If resuming from pause, record start time
    if (startTimeRef.current === null) {
      startTimeRef.current = Date.now()
    }

    const updateTimer = () => {
      if (startTimeRef.current === null) return
      
      const now = Date.now()
      const elapsedSinceStart = Math.floor((now - startTimeRef.current) / 1000)
      const totalElapsed = pausedElapsedRef.current + elapsedSinceStart
      
      setElapsed(totalElapsed)
      onTickRef.current?.(totalElapsed)
    }

    // Update immediately
    updateTimer()

    // Use a faster interval and rely on timestamps for accuracy
    // requestAnimationFrame-based approach for better background handling
    const interval = setInterval(updateTimer, 250)

    return () => clearInterval(interval)
  }, [isRunning])

  // Page Visibility API: Force immediate recalculation when tab becomes visible
  // This ensures timer shows accurate time after being backgrounded
  useEffect(() => {
    // Check if Page Visibility API is supported (graceful degradation)
    if (typeof document === "undefined" || !('visibilityState' in document)) {
      return
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isRunning && startTimeRef.current !== null) {
        // Force immediate recalculation when tab becomes visible
        const now = Date.now()
        const elapsedSinceStart = Math.floor((now - startTimeRef.current) / 1000)
        const totalElapsed = pausedElapsedRef.current + elapsedSinceStart
        
        setElapsed(totalElapsed)
        onTickRef.current?.(totalElapsed)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [isRunning])

  // Handle pause: store elapsed time
  const handlePauseResume = () => {
    if (isRunning) {
      // Pausing: save current elapsed time
      pausedElapsedRef.current = elapsed
      startTimeRef.current = null
    } else {
      // Resuming: set new start time
      startTimeRef.current = Date.now()
    }
    setIsRunning((prev) => !prev)
  }

  const remaining = durationSeconds ? Math.max(durationSeconds - elapsed, 0) : null

  const handleReset = () => {
    setElapsed(0)
    setIsRunning(false)
    startTimeRef.current = null
    pausedElapsedRef.current = 0
    onTickRef.current?.(0)
  }

  // Helper function to update timer state when adjusting elapsed time
  const updateTimerState = (newElapsed: number) => {
    setElapsed(newElapsed)
    
    // Update the base times based on whether timer is running
    if (isRunning && startTimeRef.current !== null) {
      // Recalculate start time to maintain the new elapsed value
      const now = Date.now()
      startTimeRef.current = now - newElapsed * 1000
      pausedElapsedRef.current = 0
    } else {
      // Timer is paused, just update paused elapsed
      pausedElapsedRef.current = newElapsed
    }
    
    onTickRef.current?.(newElapsed)
  }

  // Fast-forward and rewind handlers
  const handleRewind = () => {
    const newElapsed = Math.max(0, elapsed - TIME_SKIP_SECONDS)
    updateTimerState(newElapsed)
  }

  const handleFastForward = () => {
    const maxElapsed = durationSeconds 
      ? durationSeconds + OVERTIME_BUFFER_SECONDS 
      : elapsed + TIME_SKIP_SECONDS
    const newElapsed = Math.min(maxElapsed, elapsed + TIME_SKIP_SECONDS)
    updateTimerState(newElapsed)
  }

  return (
    <Card className="flex items-center gap-4 px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Timer className="h-4 w-4" />
        <span className="font-medium text-foreground">{formatDuration(elapsed)}</span>
        {remaining !== null && (
          <span className="text-muted-foreground">/ {formatDuration(durationSeconds || 0)}</span>
        )}
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleRewind}
          title="Rewind 15 seconds"
        >
          <Rewind className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={handlePauseResume}>
          {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleFastForward}
          title="Fast-forward 15 seconds"
        >
          <FastForward className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleReset}>
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
      {remaining !== null && (
        <div className="text-xs text-muted-foreground">
          {remaining === 0 ? "Over time" : `${formatDuration(remaining)} remaining`}
        </div>
      )}
    </Card>
  )
}
