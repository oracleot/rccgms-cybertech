"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ListOrdered, Play } from "lucide-react"

import { cn, formatDuration } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RundownTimer } from "@/components/rundown/rundown-timer"
import type { RundownEditorItem } from "./types"

interface LiveViewProps {
  items: RundownEditorItem[]
  serviceName?: string | null
}

const ALERT_SOUNDS = [
  { id: "beep", label: "Classic beep", type: "sine" as OscillatorType, freq: 880 },
  { id: "chime", label: "Soft chime", type: "triangle" as OscillatorType, freq: 660 },
  { id: "alarm", label: "Alarm", type: "square" as OscillatorType, freq: 980 },
]

export function LiveView({ items, serviceName }: LiveViewProps) {
  const orderedItems = useMemo(() => [...items].sort((a, b) => a.order - b.order), [items])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [started, setStarted] = useState(false)
  const [warned, setWarned] = useState(false)
  const [selectedSound, setSelectedSound] = useState<string>(ALERT_SOUNDS[0]?.id ?? "beep")
  const [isAlerting, setIsAlerting] = useState(false)

  const audioHandle = useRef<{ ctx: AudioContext; intervalId?: number } | null>(null)

  const currentItem = orderedItems[currentIndex]
  const nextItem = orderedItems[currentIndex + 1]

  const stopAlert = () => {
    const handle = audioHandle.current
    if (!handle) return
    if (handle.intervalId) window.clearInterval(handle.intervalId)
    handle.ctx.close().catch(() => {})
    audioHandle.current = null
    setIsAlerting(false)
  }

  const playBurst = (ctx: AudioContext, soundId: string) => {
    const config = ALERT_SOUNDS.find((s) => s.id === soundId) ?? ALERT_SOUNDS[0]
    const baseTime = ctx.currentTime
    const playOne = (offsetMs: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = config.type
      osc.frequency.setValueAtTime(config.freq, baseTime + offsetMs / 1000)
      gain.gain.setValueAtTime(0, baseTime + offsetMs / 1000)
      gain.gain.linearRampToValueAtTime(0.35, baseTime + offsetMs / 1000 + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.0001, baseTime + offsetMs / 1000 + 0.4)
      osc.connect(gain).connect(ctx.destination)
      osc.start(baseTime + offsetMs / 1000)
      osc.stop(baseTime + offsetMs / 1000 + 0.45)
    }

    playOne(0)
    playOne(300)
    playOne(600)
  }

  const startAlertLoop = (soundId: string) => {
    try {
      stopAlert()
      const AudioCtx = typeof window !== "undefined" ? (window.AudioContext || (window as any).webkitAudioContext) : null
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      playBurst(ctx, soundId)
      const intervalId = window.setInterval(() => playBurst(ctx, soundId), 900)
      audioHandle.current = { ctx, intervalId }
      setIsAlerting(true)
    } catch {
      // ignore if audio is blocked
    }
  }

  const previewSound = (soundId: string) => {
    try {
      const AudioCtx = typeof window !== "undefined" ? (window.AudioContext || (window as any).webkitAudioContext) : null
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      playBurst(ctx, soundId)
      setTimeout(() => ctx.close().catch(() => {}), 1500)
    } catch {
      // ignore if blocked
    }
  }

  const handleStart = () => {
    setElapsed(0)
    setStarted(true)
    setWarned(false)
    stopAlert()
  }

  // Auto-advance when duration elapses
  useEffect(() => {
    const item = orderedItems[currentIndex]
    if (!started || !item) return
    if (!item.durationSeconds || item.durationSeconds <= 0) return
    if (elapsed >= item.durationSeconds && currentIndex < orderedItems.length - 1) {
      stopAlert()
      setCurrentIndex((idx) => Math.min(idx + 1, orderedItems.length - 1))
      setElapsed(0)
      setWarned(false)
    }
  }, [elapsed, started, currentIndex, orderedItems])

  // Warn at ~1 minute remaining with audible alert
  useEffect(() => {
    const item = orderedItems[currentIndex]
    if (!started || !item || !item.durationSeconds || item.durationSeconds <= 0) return
    const remaining = item.durationSeconds - elapsed
    if (remaining <= 60 && remaining > 0 && !warned) {
      setWarned(true)
      startAlertLoop(selectedSound)
    }
  }, [elapsed, started, currentIndex, orderedItems, warned, selectedSound])

  useEffect(() => () => stopAlert(), [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Live rundown</p>
          <div className="flex items-center gap-2 text-lg font-semibold">
            <ListOrdered className="h-5 w-5 text-primary" />
            <span>{serviceName || "Service"}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
            <span>Alert sound</span>
            <Select value={selectedSound} onValueChange={setSelectedSound}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Select sound" />
              </SelectTrigger>
              <SelectContent>
                {ALERT_SOUNDS.map((sound) => (
                  <SelectItem key={sound.id} value={sound.id}>
                    {sound.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={() => previewSound(selectedSound)}>
              Preview
            </Button>
          </div>
          <Button variant="default" size="sm" onClick={handleStart} disabled={started || !currentItem}>
            <Play className="mr-2 h-4 w-4" />
            Start service
          </Button>
          {isAlerting && (
            <Button variant="destructive" size="sm" onClick={stopAlert}>
              Stop alert
            </Button>
          )}
        </div>
      </div>

      {currentItem ? (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-xl">{currentItem.title}</CardTitle>
            <p className="text-sm text-muted-foreground capitalize">{currentItem.type}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <RundownTimer
              key={currentItem.id}
              durationSeconds={currentItem.durationSeconds}
              autoStart={started}
              onTick={setElapsed}
            />
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <span>Elapsed: {formatDuration(elapsed)}</span>
              <span className="text-muted-foreground">•</span>
              <span>Total planned: {formatDuration(currentItem.durationSeconds)}</span>
            </div>
            {currentItem.notes && <p className="text-sm">{currentItem.notes}</p>}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground">
            No items in this rundown yet.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {nextItem && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Up next</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{nextItem.title}</p>
                  <p className="text-sm text-muted-foreground capitalize">{nextItem.type}</p>
                </div>
                <span className="text-sm text-muted-foreground">{formatDuration(nextItem.durationSeconds)}</span>
              </div>
            </CardContent>
          </Card>
        )}
        <Card className={cn(!nextItem && "opacity-50")}> 
          <CardHeader>
            <CardTitle className="text-base">All items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[260px] overflow-y-auto">
            {orderedItems.map((item, idx) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-center justify-between rounded-md border px-3 py-2 text-sm",
                  idx === currentIndex && "border-primary bg-primary/5"
                )}
              >
                <div className="flex flex-col">
                  <span className="font-medium">{item.title}</span>
                  <span className="text-xs text-muted-foreground capitalize">{item.type}</span>
                </div>
                <span className="text-xs text-muted-foreground">{formatDuration(item.durationSeconds)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
