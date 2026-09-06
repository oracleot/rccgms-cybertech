"use client"

/**
 * Presentational timer display + controls for the live rundown view.
 * All timing state (start timestamp, pause state, accumulated elapsed) is
 * owned by RundownLiveProvider so it survives navigating away from the
 * Rundown page - this component just renders whatever elapsed value it's
 * given and forwards control actions upward.
 */

import { Pause, Play, RotateCcw, Timer, FastForward, Rewind } from "lucide-react"

import { formatDuration } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"

interface RundownTimerProps {
  durationSeconds?: number
  elapsedSeconds: number
  isRunning: boolean
  onPauseResume: () => void
  onSeek: (newElapsedSeconds: number) => void
  onRewind: () => void
  onFastForward: () => void
  onReset: () => void
}

export function RundownTimer({
  durationSeconds,
  elapsedSeconds,
  isRunning,
  onPauseResume,
  onSeek,
  onRewind,
  onFastForward,
  onReset,
}: RundownTimerProps) {
  const remaining = durationSeconds ? Math.max(durationSeconds - elapsedSeconds, 0) : null

  // Slider max = scheduled duration (so slider reaches 100% when time runs out)
  // Extends automatically when in overtime so the thumb stays at the end
  const maxSliderValue = durationSeconds
    ? Math.max(durationSeconds, elapsedSeconds)
    : Math.max(3600, elapsedSeconds)

  return (
    <Card className="space-y-3 px-4 py-3">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Timer className="h-4 w-4" />
          <span className="font-medium text-foreground">{formatDuration(elapsedSeconds)}</span>
          {remaining !== null && (
            <span className="text-muted-foreground">/ {formatDuration(durationSeconds || 0)}</span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onRewind}
            title="Rewind 15 seconds"
          >
            <Rewind className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={onPauseResume}>
            {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onFastForward}
            title="Fast-forward 15 seconds"
          >
            <FastForward className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onReset}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
        {remaining !== null && (
          <div className="text-xs text-muted-foreground">
            {remaining === 0 ? "Over time" : `${formatDuration(remaining)} remaining`}
          </div>
        )}
      </div>

      {/* Timer Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>0:00</span>
          <span>Drag to adjust time</span>
          <span>{formatDuration(maxSliderValue)}</span>
        </div>
        <Slider
          value={[elapsedSeconds]}
          onValueChange={(value) => onSeek(value[0] ?? 0)}
          max={maxSliderValue}
          step={1}
          className="cursor-pointer"
        />
      </div>
    </Card>
  )
}
