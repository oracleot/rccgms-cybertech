"use client"

import { useEffect, useRef, useState } from "react"
import { Pause, Play, RotateCcw, Timer } from "lucide-react"

import { formatDuration } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface RundownTimerProps {
  durationSeconds?: number
  autoStart?: boolean
  onTick?: (seconds: number) => void
}

export function RundownTimer({ durationSeconds, autoStart = false, onTick }: RundownTimerProps) {
  const [isRunning, setIsRunning] = useState(autoStart)
  const [elapsed, setElapsed] = useState(0)
  const onTickRef = useRef(onTick)
  const startTimeRef = useRef<number | null>(null)
  const pausedElapsedRef = useRef<number>(0)

  // Keep onTick ref up to date without triggering effect
  useEffect(() => {
    onTickRef.current = onTick
  }, [onTick])

  useEffect(() => {
    setIsRunning(autoStart)
    if (!autoStart) {
      setElapsed(0)
      startTimeRef.current = null
      pausedElapsedRef.current = 0
      // Use setTimeout to defer callback to avoid updating parent during render
      setTimeout(() => onTickRef.current?.(0), 0)
    } else {
      // Start fresh timer with current timestamp
      startTimeRef.current = Date.now()
      pausedElapsedRef.current = 0
    }
  }, [autoStart])

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
        <Button variant="outline" size="icon" onClick={handlePauseResume}>
          {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
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
