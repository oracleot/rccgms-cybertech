"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, ListOrdered, Music, Play, SkipForward, SkipBack, Clock } from "lucide-react"

import { cn, formatDuration } from "@/lib/utils"
import { parseLyrics } from "@/lib/rundown/lyrics-parser"
import { useDisplaySync } from "@/hooks/use-display-sync"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RundownTimer } from "@/components/rundown/rundown-timer"
import { DisplayControls } from "@/components/rundown/display-controls"
import type { RundownEditorItem } from "./types"
import type { ItemChangePayload } from "@/types/rundown"

interface LiveViewProps {
  rundownId: string
  items: RundownEditorItem[]
  serviceName?: string | null
  itemsWithSongs?: Map<string, { id: string; title: string; lyrics: string | null; key: string | null }>
}

const ALERT_SOUNDS = [
  { id: "beep", label: "Classic beep", type: "sine" as OscillatorType, freq: 880 },
  { id: "chime", label: "Soft chime", type: "triangle" as OscillatorType, freq: 660 },
  { id: "alarm", label: "Alarm", type: "square" as OscillatorType, freq: 980 },
]

export function LiveView({ rundownId, items, serviceName, itemsWithSongs }: LiveViewProps) {
  const orderedItems = useMemo(() => [...items].sort((a, b) => a.order - b.order), [items])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [started, setStarted] = useState(false)
  const [warned, setWarned] = useState(false)
  const [selectedSound, setSelectedSound] = useState<string>(ALERT_SOUNDS[0]?.id ?? "beep")
  const [isAlerting, setIsAlerting] = useState(false)
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0)
  const [isInTransition, setIsInTransition] = useState(false)

  const audioHandle = useRef<{ ctx: AudioContext; intervalId?: number } | null>(null)
  const prevItemIdRef = useRef<string | null>(null)

  const currentItem = orderedItems[currentIndex]
  const nextItem = orderedItems[currentIndex + 1]

  // Get song data for the current item
  const currentSong = useMemo(() => {
    if (currentItem?.type === "song" && currentItem.songId && itemsWithSongs) {
      return itemsWithSongs.get(currentItem.songId)
    }
    return null
  }, [currentItem, itemsWithSongs])

  // Parse lyrics for current song
  const parsedLyrics = useMemo(() => {
    if (currentSong?.lyrics) {
      return parseLyrics(currentSong.lyrics)
    }
    return { verses: [] }
  }, [currentSong])

  // Initialize display sync
  const { sendMessage, isDisplayConnected, displayCount } = useDisplaySync({
    rundownId,
  })

  // Build item payload for display sync
  const buildItemPayload = useCallback(
    (index: number): ItemChangePayload => {
      const item = orderedItems[index]
      const next = orderedItems[index + 1]

      let song = null
      if (item?.type === "song" && item.songId && itemsWithSongs) {
        const songData = itemsWithSongs.get(item.songId)
        if (songData) {
          song = {
            id: songData.id,
            title: songData.title,
            lyrics: songData.lyrics,
            key: songData.key,
          }
        }
      }

      return {
        currentItemIndex: index,
        item: item
          ? {
              id: item.id,
              type: item.type,
              title: item.title,
              durationSeconds: item.durationSeconds,
              notes: item.notes,
              song,
            }
          : null,
        nextItem: next
          ? {
              id: next.id,
              type: next.type,
              title: next.title,
              durationSeconds: next.durationSeconds,
            }
          : undefined,
      }
    },
    [orderedItems, itemsWithSongs]
  )

  // Build enriched nextItem payload for transition messages
  const buildNextItemPayload = useCallback(
    (item: RundownEditorItem | undefined) => {
      if (!item) return null

      let song = null
      if (item.type === "song" && item.songId && itemsWithSongs) {
        const songData = itemsWithSongs.get(item.songId)
        if (songData) {
          song = {
            id: songData.id,
            title: songData.title,
            lyrics: songData.lyrics,
            key: songData.key,
          }
        }
      }

      return {
        id: item.id,
        title: item.title,
        type: item.type,
        durationSeconds: item.durationSeconds,
        notes: item.notes || null,
        song,
      }
    },
    [itemsWithSongs]
  )

  // Broadcast item change when current index changes
  useEffect(() => {
    if (currentItem?.id !== prevItemIdRef.current) {
      prevItemIdRef.current = currentItem?.id ?? null
      setCurrentVerseIndex(0) // Reset verse when item changes

      sendMessage({
        type: "ITEM_CHANGE",
        payload: buildItemPayload(currentIndex),
      })
    }
  }, [currentIndex, currentItem, sendMessage, buildItemPayload])

  // Broadcast timer updates
  useEffect(() => {
    if (!started || !currentItem) return

    const remaining = Math.max(0, currentItem.durationSeconds - elapsed)
    sendMessage({
      type: "TIMER_UPDATE",
      payload: {
        elapsed,
        remaining,
        isRunning: started,
      },
    })
  }, [elapsed, started, currentItem, sendMessage])

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
      type WindowWithWebkit = Window & { webkitAudioContext?: typeof AudioContext }
      const AudioCtx = typeof window !== "undefined" ? (window.AudioContext || (window as WindowWithWebkit).webkitAudioContext) : null
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
      type WindowWithWebkit = Window & { webkitAudioContext?: typeof AudioContext }
      const AudioCtx = typeof window !== "undefined" ? (window.AudioContext || (window as WindowWithWebkit).webkitAudioContext) : null
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

    // Broadcast initial state when service starts
    sendMessage({
      type: "ITEM_CHANGE",
      payload: buildItemPayload(currentIndex),
    })
  }

  // Handle verse navigation for songs
  const handlePrevVerse = useCallback(() => {
    if (currentVerseIndex > 0) {
      const newIndex = currentVerseIndex - 1
      setCurrentVerseIndex(newIndex)
      sendMessage({
        type: "LYRIC_ADVANCE",
        payload: {
          currentVerseIndex: newIndex,
          totalVerses: parsedLyrics.verses.length,
        },
      })
    }
  }, [currentVerseIndex, parsedLyrics.verses.length, sendMessage])

  const handleNextVerse = useCallback(() => {
    if (currentVerseIndex < parsedLyrics.verses.length - 1) {
      const newIndex = currentVerseIndex + 1
      setCurrentVerseIndex(newIndex)
      sendMessage({
        type: "LYRIC_ADVANCE",
        payload: {
          currentVerseIndex: newIndex,
          totalVerses: parsedLyrics.verses.length,
        },
      })
    }
  }, [currentVerseIndex, parsedLyrics.verses.length, sendMessage])

  // Auto-transition when duration elapses (instead of auto-advancing)
  useEffect(() => {
    const item = orderedItems[currentIndex]
    if (!started || !item) return
    if (!item.durationSeconds || item.durationSeconds <= 0) return
    if (elapsed >= item.durationSeconds && !isInTransition) {
      stopAlert()
      setIsInTransition(true)
      
      // Broadcast transition state to display
      // For the last item, nextItem will be null, triggering "Service Complete" on display
      sendMessage({
        type: "TRANSITION",
        payload: {
          isInTransition: true,
          completedItem: {
            id: item.id,
            title: item.title,
            type: item.type,
          },
          nextItem: buildNextItemPayload(nextItem),
          serviceName: serviceName || null,
        },
      })
    }
  }, [elapsed, started, currentIndex, orderedItems, isInTransition, sendMessage, serviceName, nextItem, buildNextItemPayload])

  // Handler to start next item from transition
  const handleStartNextItem = useCallback(() => {
    if (!isInTransition || currentIndex >= orderedItems.length - 1) return
    
    setIsInTransition(false)
    setCurrentIndex((idx) => Math.min(idx + 1, orderedItems.length - 1))
    setElapsed(0)
    setWarned(false)
    
    // Broadcast that we're exiting transition
    sendMessage({
      type: "TRANSITION",
      payload: {
        isInTransition: false,
        completedItem: null,
        nextItem: null,
        serviceName: serviceName || null,
      },
    })
  }, [isInTransition, currentIndex, orderedItems.length, sendMessage, serviceName])

  // Handler to skip to next item (without waiting for timer)
  const handleSkipToNext = useCallback(() => {
    if (currentIndex >= orderedItems.length - 1) return
    
    stopAlert()
    setIsInTransition(true)
    
    const item = orderedItems[currentIndex]
    sendMessage({
      type: "TRANSITION",
      payload: {
        isInTransition: true,
        completedItem: item ? {
          id: item.id,
          title: item.title,
          type: item.type,
        } : null,
        nextItem: buildNextItemPayload(nextItem),
        serviceName: serviceName || null,
      },
    })
  }, [currentIndex, orderedItems, nextItem, sendMessage, serviceName, buildNextItemPayload])

  // Handler to go back to previous item
  const handleGoToPrevious = useCallback(() => {
    if (currentIndex <= 0) return
    
    stopAlert()
    setElapsed(0)
    setWarned(false)
    setIsInTransition(false)
    
    // Update index - this will trigger the useEffect that broadcasts the item change
    setCurrentIndex((idx) => Math.max(idx - 1, 0))
  }, [currentIndex])

  // Handler to jump to a specific item by index
  const handleGoToItem = useCallback((targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= orderedItems.length) return

    stopAlert()
    setElapsed(0)
    setWarned(false)
    setIsInTransition(false)

    // Start service if not already started
    if (!started) {
      setStarted(true)
    }

    setCurrentIndex(targetIndex)

    // Exit any active transition on display
    sendMessage({
      type: "TRANSITION",
      payload: {
        isInTransition: false,
        completedItem: null,
        nextItem: null,
        serviceName: serviceName || null,
      },
    })
  }, [orderedItems.length, started, sendMessage, serviceName])

  // Warn at ~1 minute remaining with audible alert
  useEffect(() => {
    const item = orderedItems[currentIndex]
    if (!started || !item || !item.durationSeconds || item.durationSeconds <= 0) return
    const remaining = item.durationSeconds - elapsed
    if (remaining <= 60 && remaining > 0 && !warned) {
      setWarned(true)
      startAlertLoop(selectedSound)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- startAlertLoop is stable, including it causes infinite loop
  }, [elapsed, started, currentIndex, orderedItems, warned, selectedSound])

  useEffect(() => () => stopAlert(), [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Live rundown</p>
          <div className="flex items-center gap-2 text-lg font-semibold">
            <ListOrdered className="h-5 w-5 text-primary" />
            <span>{serviceName || "Service"}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Display controls */}
          <DisplayControls
            rundownId={rundownId}
            isDisplayConnected={isDisplayConnected}
            displayCount={displayCount}
          />

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
          <Button variant="default" size="sm" onClick={handleStart} disabled={started || !currentItem || isInTransition}>
            <Play className="mr-2 h-4 w-4" />
            Start service
          </Button>
          {started && !isInTransition && currentIndex > 0 && (
            <Button variant="outline" size="sm" onClick={handleGoToPrevious}>
              <SkipBack className="mr-2 h-4 w-4" />
              Go to previous
            </Button>
          )}
          {started && !isInTransition && nextItem && (
            <Button variant="outline" size="sm" onClick={handleSkipToNext}>
              <SkipForward className="mr-2 h-4 w-4" />
              Skip to next
            </Button>
          )}
          {isAlerting && (
            <Button variant="destructive" size="sm" onClick={stopAlert}>
              Stop alert
            </Button>
          )}
        </div>
      </div>

      {/* Transition Screen */}
      {isInTransition && nextItem && (
        <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600 animate-pulse" />
              <CardTitle className="text-lg text-amber-700 dark:text-amber-400">
                Transition Break
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-2">Up Next</p>
              <h2 className="text-2xl font-bold">{nextItem.title}</h2>
              <p className="text-sm text-muted-foreground capitalize mt-1">
                {nextItem.type} • {formatDuration(nextItem.durationSeconds)}
              </p>
            </div>
            <div className="flex justify-center">
              <Button 
                size="lg" 
                onClick={handleStartNextItem}
                className="px-8"
              >
                <Play className="mr-2 h-5 w-5" />
                Start &quot;{nextItem.title}&quot;
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Service Complete Screen - shown when last item timer ends */}
      {isInTransition && !nextItem && (
        <Card className="border-green-500/50 bg-green-50/50 dark:bg-green-950/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
                <span className="text-white text-xs">✓</span>
              </div>
              <CardTitle className="text-lg text-green-700 dark:text-green-400">
                Service Complete
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-8">
              <h2 className="text-3xl font-bold mb-2">Thanks for your help!</h2>
              <p className="text-muted-foreground">
                All rundown items have been completed.
              </p>
            </div>
            <div className="flex justify-center">
              <Button 
                variant="outline"
                size="lg" 
                onClick={() => {
                  setIsInTransition(false)
                  setStarted(false)
                  setCurrentIndex(0)
                  setElapsed(0)
                  sendMessage({
                    type: "TRANSITION",
                    payload: {
                      isInTransition: false,
                      completedItem: null,
                      nextItem: null,
                      serviceName: serviceName || null,
                    },
                  })
                }}
                className="px-8"
              >
                Reset Service
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentItem && !isInTransition ? (
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

            {/* Verse navigation for song items */}
            {currentItem.type === "song" && parsedLyrics.verses.length > 0 && (
              <div className="border-t pt-3 mt-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Music className="h-4 w-4 text-primary" />
                    <span className="font-medium">
                      Verse {currentVerseIndex + 1} of {parsedLyrics.verses.length}
                    </span>
                    {currentSong?.key && (
                      <span className="text-muted-foreground">• Key: {currentSong.key}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrevVerse}
                      disabled={currentVerseIndex === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextVerse}
                      disabled={currentVerseIndex >= parsedLyrics.verses.length - 1}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {/* Current verse preview */}
                <div className="mt-2 p-3 rounded-md bg-muted/50 text-sm whitespace-pre-line">
                  {parsedLyrics.verses[currentVerseIndex]?.content || "No lyrics available"}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : !isInTransition ? (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground">
            No items in this rundown yet.
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-0">
          <Tabs defaultValue="all-items" aria-label="Rundown navigation">
            <TabsList>
              <TabsTrigger value="all-items">All items</TabsTrigger>
              <TabsTrigger value="up-next">Up next</TabsTrigger>
            </TabsList>
            <TabsContent value="all-items">
              <div className="space-y-2 max-h-[260px] overflow-y-auto py-3">
                {orderedItems.map((item, idx) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleGoToItem(idx)}
                    aria-label={`Go to ${item.title}`}
                    className={cn(
                      "flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm text-left transition-colors",
                      "hover:bg-accent hover:border-accent-foreground/20 cursor-pointer",
                      idx === currentIndex && started && "border-primary bg-primary/5 font-semibold",
                      idx < currentIndex && started && "opacity-60"
                    )}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{item.title}</span>
                      <span className="text-xs text-muted-foreground capitalize">{item.type}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDuration(item.durationSeconds)}</span>
                  </button>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="up-next">
              <div className="py-3">
                {currentItem && started ? (
                  <div className="space-y-3">
                    <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
                      <p className="text-xs text-muted-foreground mb-1">Now on display</p>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{currentItem.title}</p>
                          <p className="text-sm text-muted-foreground capitalize">{currentItem.type}</p>
                        </div>
                        <span className="text-sm text-muted-foreground">{formatDuration(currentItem.durationSeconds)}</span>
                      </div>
                    </div>
                    {nextItem && (
                      <div className="rounded-md border px-3 py-2">
                        <p className="text-xs text-muted-foreground mb-1">Up next</p>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{nextItem.title}</p>
                            <p className="text-sm text-muted-foreground capitalize">{nextItem.type}</p>
                          </div>
                          <span className="text-sm text-muted-foreground">{formatDuration(nextItem.durationSeconds)}</span>
                        </div>
                      </div>
                    )}
                    {!nextItem && !isInTransition && (
                      <p className="text-sm text-muted-foreground text-center py-4">This is the last item.</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {orderedItems.length === 0 ? "No items in this rundown." : "Start the service to see display info."}
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardHeader>
      </Card>
    </div>
  )
}
