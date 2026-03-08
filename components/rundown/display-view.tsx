"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Image from "next/image"
import confetti from "canvas-confetti"
import { Maximize2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { parseLyrics } from "@/lib/rundown/lyrics-parser"
import { useDisplayReceiver } from "@/hooks/use-display-sync"
import { LyricsDisplay } from "./lyrics-display"
import type {
  DisplaySyncMessage,
  ItemChangePayload,
  TimerUpdatePayload,
  TransitionPayload,
  RundownItemForDisplay,
} from "@/types/rundown"
import type { DisplaySettingsWithDefaults } from "@/types/settings"

interface DisplayViewProps {
  rundownId: string
  initialItems: RundownItemForDisplay[]
  initialSettings: DisplaySettingsWithDefaults
  serviceName?: string | null
}

/**
 * Creative countdown timer component for projection display
 */
function ProjectionTimer({
  elapsed,
  remaining,
  isRunning,
  fontSize,
  textColor,
}: {
  elapsed: number
  remaining: number
  isRunning: boolean
  fontSize: number
  textColor: string
}) {
  // Format time with leading zeros
  const formatTime = (seconds: number) => {
    const mins = Math.floor(Math.abs(seconds) / 60)
    const secs = Math.abs(seconds) % 60
    const prefix = seconds < 0 ? "-" : ""
    return `${prefix}${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Determine urgency level for visual effects
  const isWarning = remaining <= 120 && remaining > 60
  const isCritical = remaining <= 60 && remaining > 0
  const isOvertime = remaining < 0

  // Calculate progress percentage (capped at 100%)
  const totalDuration = elapsed + remaining
  const progress = totalDuration > 0 ? Math.min((elapsed / totalDuration) * 100, 100) : 0

  if (!isRunning) return null

  return (
    <div className="flex flex-col items-center justify-center py-8">
      {/* Main timer display */}
      <div
        className={cn(
          "relative flex items-center justify-center",
          "transition-all duration-300 ease-out"
        )}
      >
        {/* Glow effect for urgent states */}
        {(isCritical || isOvertime) && (
          <div
            className={cn(
              "absolute inset-0 blur-3xl rounded-full opacity-30",
              "animate-pulse"
            )}
            style={{
              backgroundColor: isOvertime ? "#ef4444" : "#f59e0b",
              transform: "scale(1.5)",
            }}
          />
        )}

        {/* Timer digits - HUGE for visibility */}
        <div
          className={cn(
            "relative font-mono font-bold tracking-tighter leading-none",
            "transition-all duration-500",
            isWarning && "text-amber-400",
            isCritical && "text-amber-500 animate-pulse",
            isOvertime && "text-red-500"
          )}
          style={{
            fontSize: "clamp(14rem, 33vw, 40rem)",
            textShadow: isCritical || isOvertime
              ? `0 0 5rem ${isOvertime ? "#ef4444" : "#f59e0b"}80, 0 0 10rem ${isOvertime ? "#ef4444" : "#f59e0b"}40`
              : `0 0 3rem ${textColor}20`,
            color: !isWarning && !isCritical && !isOvertime ? textColor : undefined,
            letterSpacing: "-0.05em",
          }}
        >
          {formatTime(remaining)}
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="mt-8 w-full max-w-2xl h-3 rounded-full overflow-hidden"
        style={{ backgroundColor: `${textColor}20` }}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-1000 ease-linear",
            isWarning && "bg-amber-400",
            isCritical && "bg-amber-500",
            isOvertime && "bg-red-500"
          )}
          style={{
            width: `${progress}%`,
            backgroundColor: !isWarning && !isCritical && !isOvertime ? textColor : undefined,
          }}
        />
      </div>

      {/* Status label */}
      <div
        className={cn(
          "mt-4 px-4 py-1.5 rounded-full text-sm uppercase tracking-widest",
          "transition-colors duration-300",
          isOvertime && "bg-red-500/20 text-red-400",
          isCritical && !isOvertime && "bg-amber-500/20 text-amber-400"
        )}
        style={{
          fontSize: Math.max(14, fontSize * 0.25),
          backgroundColor: !isCritical && !isOvertime ? `${textColor}15` : undefined,
          color: !isCritical && !isOvertime ? `${textColor}80` : undefined,
        }}
      >
        {isOvertime ? "OVERTIME" : isCritical ? "ENDING SOON" : "TIME REMAINING"}
      </div>
    </div>
  )
}

/**
 * End of service component with confetti celebration
 */
function EndOfServiceConfetti({ textColor }: { textColor: string }) {
  const hasFireRef = useRef(false)

  useEffect(() => {
    if (hasFireRef.current) return
    hasFireRef.current = true

    // Fire confetti from both sides
    const duration = 4000
    const animationEnd = Date.now() + duration
    const colors = ["#a786ff", "#fd86ff", "#87CEEB", "#f8deb1", "#FFD700"]

    const frame = () => {
      if (Date.now() > animationEnd) return

      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        startVelocity: 60,
        origin: { x: 0, y: 0.5 },
        colors,
        zIndex: 9999,
      })
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        startVelocity: 60,
        origin: { x: 1, y: 0.5 },
        colors,
        zIndex: 9999,
      })

      requestAnimationFrame(frame)
    }

    frame()
  }, [])

  return (
    <div className="animate-in fade-in duration-700 text-center">
      <h1
        className="font-bold animate-[breathe_3s_ease-in-out_infinite] leading-none"
        style={{
          fontSize: "clamp(4rem, 15vw, 22vh)",
          textShadow: `0 0 5rem ${textColor}40, 0 0 10rem ${textColor}20`,
          letterSpacing: "0.1em",
        }}
      >
        SERVICE OVER!
      </h1>
    </div>
  )
}

/**
 * Main projection display component
 * Receives updates from the operator's live view via BroadcastChannel
 */
export function DisplayView({
  rundownId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- reserved for future offline support
  initialItems,
  initialSettings,
  serviceName,
}: DisplayViewProps) {
  const [settings, setSettings] = useState(initialSettings)
  const [currentItem, setCurrentItem] = useState<ItemChangePayload["item"]>(null)
  const [nextItem, setNextItem] = useState<ItemChangePayload["nextItem"]>(null)
  const [timer, setTimer] = useState<TimerUpdatePayload>({
    elapsed: 0,
    remaining: 0,
    isRunning: false,
  })
  const [currentVerseIndex, setCurrentVerseIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [showTransitionScreen, setShowTransitionScreen] = useState(false)
  const [transitionData, setTransitionData] = useState<TransitionPayload | null>(null)
  const [isRedFlash, setIsRedFlash] = useState(false)
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(false)
  const [isTimeoutBlinkRed, setIsTimeoutBlinkRed] = useState(false)
  const prevItemIdRef = useRef<string | null>(null)
  const hasFlashedRef = useRef(false)
  
  // Independent timer management (doesn't rely on control window)
  const timerStartTimeRef = useRef<number | null>(null)
  const timerDurationRef = useRef<number>(0)
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const [isTimerActive, setIsTimerActive] = useState(false) // State to trigger timer effect

  // Parse lyrics for the current song item
  const parsedLyrics = useMemo(() => {
    if (currentItem?.type === "song" && currentItem.song?.lyrics) {
      return parseLyrics(currentItem.song.lyrics)
    }
    return { verses: [] }
  }, [currentItem])

  // Handle incoming messages from the operator
  const handleMessage = useCallback((message: DisplaySyncMessage) => {
    switch (message.type) {
      case "ITEM_CHANGE":
        // Exit transition screen when new item starts
        setShowTransitionScreen(false)
        setTransitionData(null)
        // Trigger transition animation
        if (message.payload.item?.id !== prevItemIdRef.current) {
          setIsTransitioning(true)
          setTimeout(() => setIsTransitioning(false), 500)
        }
        prevItemIdRef.current = message.payload.item?.id ?? null
        setCurrentItem(message.payload.item)
        setNextItem(message.payload.nextItem)
        setCurrentVerseIndex(0) // Reset verse when item changes
        
        // Reset independent timer when item changes
        timerStartTimeRef.current = null
        timerDurationRef.current = 0
        setIsTimerActive(false)
        setTimer({ elapsed: 0, remaining: 0, isRunning: false })
        setIsRedFlash(false)
        hasFlashedRef.current = false
        break

      case "TIMER_UPDATE":
        // Sync with control window timer
        const timerPayload = message.payload
        setTimer(timerPayload)
        
        // Initialize or update independent timer
        if (timerPayload.isRunning) {
          // Calculate start time based on elapsed seconds
          const now = Date.now()
          timerStartTimeRef.current = now - (timerPayload.elapsed * 1000)
          // Use duration from payload or calculate from elapsed + remaining
          timerDurationRef.current = timerPayload.elapsed + timerPayload.remaining
          setIsTimerActive(true)
        } else {
          timerStartTimeRef.current = null
          timerDurationRef.current = 0
          setIsTimerActive(false)
        }
        break

      case "LYRIC_ADVANCE":
        setCurrentVerseIndex(message.payload.currentVerseIndex)
        break

      case "SETTINGS_UPDATE":
        setSettings((prev) => ({
          ...prev,
          fontSize: message.payload.fontSize,
          fontFamily: message.payload.fontFamily as DisplaySettingsWithDefaults["fontFamily"],
          backgroundColor: message.payload.backgroundColor,
          textColor: message.payload.textColor,
          logoUrl: message.payload.logoUrl,
          transitionEffect: message.payload.transitionEffect as DisplaySettingsWithDefaults["transitionEffect"],
        }))
        break

      case "TRANSITION":
        // Show the transition screen between items
        setShowTransitionScreen(message.payload.isInTransition)
        if (message.payload.isInTransition) {
          setTransitionData(message.payload)
        } else {
          setTransitionData(null)
        }
        break
    }
  }, [])

  // Initialize display receiver
  useDisplayReceiver(rundownId, handleMessage)

  // Show fullscreen prompt if requested via query parameter (from multi-screen selection)
  // Fullscreen API requires a user gesture, so we show a click overlay instead of auto-requesting
  useEffect(() => {
    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)
    if (params.get('autoFullscreen') === 'true') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time mount initialization from URL search params
      setShowFullscreenPrompt(true)
    }
  }, [])

  // Independent timer loop - continues running even when control window is backgrounded
  useEffect(() => {
    // Clear any existing interval first
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }

    if (!isTimerActive || !timerStartTimeRef.current || !timerDurationRef.current) {
      return
    }

    // Update timer every 250ms using Date.now() for accuracy
    const updateTimer = () => {
      if (!timerStartTimeRef.current || !timerDurationRef.current) return

      const now = Date.now()
      const elapsedMs = now - timerStartTimeRef.current
      const elapsedSeconds = Math.floor(elapsedMs / 1000)
      const remainingSeconds = Math.max(0, timerDurationRef.current - elapsedSeconds)

      setTimer({
        elapsed: elapsedSeconds,
        remaining: remainingSeconds,
        isRunning: true,
      })
    }

    // Run immediately
    updateTimer()

    // Then run every 250ms
    timerIntervalRef.current = setInterval(updateTimer, 250)

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
    }
  }, [isTimerActive])

  // Page Visibility API: Force timer recalculation when tab becomes visible
  // Ensures timer catches up if browser throttled the interval while backgrounded
  useEffect(() => {
    // Check if Page Visibility API is supported (graceful degradation)
    if (typeof document === "undefined" || !('visibilityState' in document)) {
      return
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && timerStartTimeRef.current && timerDurationRef.current) {
        // Force immediate recalculation when tab becomes visible
        const now = Date.now()
        const elapsedMs = now - timerStartTimeRef.current
        const elapsedSeconds = Math.floor(elapsedMs / 1000)
        const remainingSeconds = Math.max(0, timerDurationRef.current - elapsedSeconds)

        setTimer({
          elapsed: elapsedSeconds,
          remaining: remainingSeconds,
          isRunning: true,
        })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // Red flash effect when timer reaches zero — a bright visual cue instead of sound
  useEffect(() => {
    if (
      timer.isRunning &&
      timer.remaining <= 0 &&
      timer.elapsed > 0 &&
      !hasFlashedRef.current
    ) {
      hasFlashedRef.current = true
      // eslint-disable-next-line react-hooks/set-state-in-effect -- immediate visual flash cue required when timer hits zero
      setIsRedFlash(true)

      // Flash 3 times: on  →  off  →  on  →  off  →  on  →  off
      const timers: NodeJS.Timeout[] = []
      timers.push(setTimeout(() => setIsRedFlash(false), 400))
      timers.push(setTimeout(() => setIsRedFlash(true), 600))
      timers.push(setTimeout(() => setIsRedFlash(false), 1000))
      timers.push(setTimeout(() => setIsRedFlash(true), 1200))
      timers.push(setTimeout(() => setIsRedFlash(false), 1600))

      return () => timers.forEach(clearTimeout)
    }
  }, [timer.isRunning, timer.remaining, timer.elapsed])

  // Blinking red "TIME OUT!" text — escalates after 45 seconds of operator inaction
  const hasNextItemInTransition = transitionData?.nextItem != null
  useEffect(() => {
    if (!showTransitionScreen || !hasNextItemInTransition) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset blink state when transition screen is dismissed
      setIsTimeoutBlinkRed(false)
      return
    }

    const startTime = Date.now()
    let timeoutId: NodeJS.Timeout

    const tick = () => {
      const elapsedMs = Date.now() - startTime
      const isUrgent = elapsedMs > 45_000 // 45 seconds → faster blinking
      const interval = isUrgent ? 300 : 800

      setIsTimeoutBlinkRed((prev) => !prev)
      timeoutId = setTimeout(tick, interval)
    }

    // Start blinking after a brief pause
    timeoutId = setTimeout(tick, 800)

    return () => {
      clearTimeout(timeoutId)
      setIsTimeoutBlinkRed(false)
    }
  }, [showTransitionScreen, hasNextItemInTransition])

  // Transition class based on settings
  const transitionClass = useMemo(() => {
    switch (settings.transitionEffect) {
      case "fade":
        return "transition-opacity duration-500"
      case "slide":
        return "transition-transform duration-500"
      default:
        return ""
    }
  }, [settings.transitionEffect])

  return (
    <div
      className={cn(
        "h-screen w-full flex flex-col overflow-hidden relative",
        transitionClass
      )}
      style={{
        backgroundColor: settings.backgroundColor,
        color: settings.textColor,
        fontFamily: settings.fontFamily,
      }}
    >
      {/* Bright red flash overlay — visual alert when time runs out */}
      <div
        className={cn(
          "absolute inset-0 z-50 pointer-events-none transition-opacity duration-150",
          isRedFlash ? "opacity-100" : "opacity-0"
        )}
        style={{ backgroundColor: "#ff0000" }}
      />

      {/* Fullscreen prompt overlay — requires user gesture to enter fullscreen */}
      {showFullscreenPrompt && (
        <div
          className="absolute inset-0 z-[60] flex items-center justify-center cursor-pointer bg-black/90 animate-in fade-in duration-300"
          onClick={() => {
            document.documentElement.requestFullscreen?.()
              .then(() => setShowFullscreenPrompt(false))
              .catch(() => setShowFullscreenPrompt(false))
          }}
        >
          <div className="text-center text-white space-y-4">
            <Maximize2 className="h-20 w-20 mx-auto animate-pulse" />
            <p className="text-3xl font-bold">Tap to Enter Fullscreen</p>
            <p className="text-sm opacity-50">Press Esc to exit later</p>
          </div>
        </div>
      )}

      {/* Logo (optional) */}
      {settings.logoUrl && (
        <div className="absolute top-4 right-4 h-16 w-auto">
          <Image
            src={settings.logoUrl}
            alt="Logo"
            width={64}
            height={64}
            className="h-16 w-auto object-contain opacity-70"
          />
        </div>
      )}

      {/* Main content area */}
      <div
        className={cn(
          "flex-1 flex flex-col items-center justify-center px-8 py-6 min-h-0",
          isTransitioning && settings.transitionEffect === "fade" && "opacity-0",
          isTransitioning && settings.transitionEffect === "slide" && "translate-y-4"
        )}
      >
        {showTransitionScreen && transitionData ? (
          /* Transition/Timeout Screen */
          <div className="text-center animate-in fade-in duration-500">
            {/* Completed item indicator */}
            {transitionData.completedItem && (
              <div 
                className="mb-8 opacity-50"
                style={{ fontSize: Math.max(18, settings.fontSize * 0.4) }}
              >
                <span className="line-through">{transitionData.completedItem.title}</span>
                <span className="ml-3 text-green-500">✓</span>
              </div>
            )}

            {/* Breathing pulse animation */}
            <div className="relative inline-block">
              <div 
                className="absolute inset-0 blur-3xl rounded-full opacity-20 animate-pulse"
                style={{ 
                  backgroundColor: settings.textColor,
                  transform: "scale(2)",
                }}
              />
            </div>

            {/* Next item info or End of service */}
            {transitionData.nextItem ? (
              <>
                {/* TIME OUT - BIG with blinking red that escalates after 45s */}
                <h1
                  className={cn(
                    "font-bold mb-8 leading-none transition-colors duration-150",
                    !isTimeoutBlinkRed && "animate-[breathe_3s_ease-in-out_infinite]"
                  )}
                  style={{ 
                    fontSize: "clamp(60px, 15vw, 22vh)",
                    textShadow: isTimeoutBlinkRed
                      ? "0 0 80px #ef444460, 0 0 160px #ef444430"
                      : `0 0 80px ${settings.textColor}40, 0 0 160px ${settings.textColor}20`,
                    letterSpacing: "0.1em",
                    color: isTimeoutBlinkRed ? "#ef4444" : undefined,
                  }}
                >
                  TIME OUT!
                </h1>

                {/* Up Next label */}
                <div 
                  className="px-6 py-2 rounded-full text-sm uppercase tracking-[0.3em] mb-6"
                  style={{
                    fontSize: Math.max(18, settings.fontSize * 0.3),
                    backgroundColor: `${settings.textColor}15`,
                    color: `${settings.textColor}90`,
                  }}
                >
                  Up Next
                </div>

                {/* Next item title */}
                <h2
                  className="font-semibold mb-4 animate-in slide-in-from-bottom-4 duration-700"
                  style={{ 
                    fontSize: "clamp(36px, 6vw, 100px)",
                  }}
                >
                  {transitionData.nextItem.title}
                </h2>
              </>
            ) : (
              /* End of service - SERVICE OVER with confetti (no TIME OUT) */
              <EndOfServiceConfetti textColor={settings.textColor} />
            )}

            {/* Waiting indicator */}
            <div 
              className="mt-12 flex items-center gap-3 opacity-40 animate-pulse"
              style={{ fontSize: Math.max(16, settings.fontSize * 0.3) }}
            >
              <div 
                className="w-2 h-2 rounded-full animate-bounce"
                style={{ backgroundColor: settings.textColor, animationDelay: "0ms" }}
              />
              <div 
                className="w-2 h-2 rounded-full animate-bounce"
                style={{ backgroundColor: settings.textColor, animationDelay: "150ms" }}
              />
              <div 
                className="w-2 h-2 rounded-full animate-bounce"
                style={{ backgroundColor: settings.textColor, animationDelay: "300ms" }}
              />
              <span className="ml-2">Waiting for operator</span>
            </div>
          </div>
        ) : currentItem ? (
          <>
            {/* Item type badge */}
            <div
              className="mb-4 px-4 py-1.5 rounded-full text-sm uppercase tracking-wider opacity-60"
              style={{
                fontSize: Math.max(16, settings.fontSize * 0.3),
                backgroundColor: `${settings.textColor}15`,
              }}
            >
              {currentItem.type}
            </div>

            {/* Title */}
            <h1
              className="text-center font-bold mb-6"
              style={{ fontSize: settings.fontSize }}
            >
              {currentItem.title}
            </h1>

            {/* Song lyrics display */}
            {currentItem.type === "song" && currentItem.song?.lyrics ? (
              <LyricsDisplay
                lyrics={parsedLyrics}
                currentVerseIndex={currentVerseIndex}
                fontSize={settings.fontSize}
                textColor={settings.textColor}
                songKey={currentItem.song.key}
              />
            ) : (
              /* Notes for non-song items */
              currentItem.notes && (
                <p
                  className="text-center opacity-80 max-w-4xl"
                  style={{ fontSize: Math.max(20, settings.fontSize * 0.6) }}
                >
                  {currentItem.notes}
                </p>
              )
            )}

            {/* Big creative timer display */}
            {timer.isRunning && currentItem.durationSeconds > 0 && (
              <div className="mt-8 w-full max-w-2xl">
                <ProjectionTimer
                  elapsed={timer.elapsed}
                  remaining={timer.remaining}
                  isRunning={timer.isRunning}
                  fontSize={settings.fontSize}
                  textColor={settings.textColor}
                />
              </div>
            )}
          </>
        ) : (
          /* Waiting state */
          <div className="text-center opacity-50">
            <h2
              style={{ fontSize: settings.fontSize }}
              className="font-semibold"
            >
              {serviceName || "Ready"}
            </h2>
            <p
              style={{ fontSize: Math.max(18, settings.fontSize * 0.4) }}
              className="mt-2"
            >
              Waiting for service to start...
            </p>
          </div>
        )}
      </div>

      {/* Bottom bar: up next only (timer moved to main area) */}
      <div
        className="flex items-center justify-end px-8 py-4"
        style={{
          backgroundColor: `${settings.textColor}08`,
          fontSize: Math.max(16, settings.fontSize * 0.35),
        }}
      >
        {/* Up next */}
        {nextItem && (
          <div className="flex items-center gap-2 opacity-60">
            <span>Up next:</span>
            <span className="font-medium">{nextItem.title}</span>
            <span className="opacity-50">
              ({Math.floor(nextItem.durationSeconds / 60)}m)
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
