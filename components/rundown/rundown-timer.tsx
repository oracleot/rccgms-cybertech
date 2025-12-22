"use client"

import { useEffect, useState } from "react"
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

  useEffect(() => {
    setIsRunning(autoStart)
    if (!autoStart) {
      setElapsed(0)
      onTick?.(0)
    }
  }, [autoStart, onTick])

  useEffect(() => {
    if (!isRunning) return // No change, just ensuring consistency

    const interval = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1
        onTick?.(next)
        return next
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isRunning, onTick])

  const remaining = durationSeconds ? Math.max(durationSeconds - elapsed, 0) : null

  const handleReset = () => {
    setElapsed(0)
    setIsRunning(false)
    onTick?.(0)
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
        <Button variant="outline" size="icon" onClick={() => setIsRunning((prev) => !prev)}>
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
