"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import type { ParsedLyrics } from "@/types/rundown"

interface LyricsDisplayProps {
  lyrics: ParsedLyrics
  currentVerseIndex: number
  fontSize: number
  textColor: string
  songKey?: string | null
}

/**
 * Displays song lyrics with verse highlighting
 * Automatically scrolls to the current verse
 */
export function LyricsDisplay({
  lyrics,
  currentVerseIndex,
  fontSize,
  textColor,
  songKey,
}: LyricsDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const activeVerseRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to active verse
  useEffect(() => {
    if (activeVerseRef.current) {
      activeVerseRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      })
    }
  }, [currentVerseIndex])

  if (lyrics.verses.length === 0) {
    return (
      <p
        className="text-center opacity-50"
        style={{ fontSize: Math.max(18, fontSize * 0.5) }}
      >
        No lyrics available
      </p>
    )
  }

  // For single-verse display (projection mode), show only current verse
  const isSingleVerseMode = true // Could be configurable

  if (isSingleVerseMode) {
    const currentVerse = lyrics.verses[currentVerseIndex]
    
    if (!currentVerse) {
      return null
    }

    return (
      <div className="flex flex-col items-center max-w-5xl w-full">
        {/* Song key indicator */}
        {songKey && (
          <div
            className="mb-4 px-3 py-1 rounded-full opacity-50"
            style={{
              fontSize: Math.max(14, fontSize * 0.25),
              backgroundColor: `${textColor}10`,
            }}
          >
            Key: {songKey}
          </div>
        )}

        {/* Verse indicator */}
        {lyrics.verses.length > 1 && (
          <div
            className="mb-4 opacity-40"
            style={{ fontSize: Math.max(14, fontSize * 0.25) }}
          >
            Verse {currentVerseIndex + 1} of {lyrics.verses.length}
          </div>
        )}

        {/* Current verse content */}
        <div
          className="text-center leading-relaxed whitespace-pre-line"
          style={{ fontSize: Math.max(24, fontSize * 0.75) }}
        >
          {currentVerse.content}
        </div>
      </div>
    )
  }

  // Multi-verse display mode (scrollable list)
  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center max-w-5xl w-full max-h-[60vh] overflow-y-auto"
    >
      {/* Song key indicator */}
      {songKey && (
        <div
          className="mb-4 px-3 py-1 rounded-full opacity-50 sticky top-0 z-10"
          style={{
            fontSize: Math.max(14, fontSize * 0.25),
            backgroundColor: `${textColor}10`,
          }}
        >
          Key: {songKey}
        </div>
      )}

      {/* All verses */}
      <div className="space-y-8 w-full">
        {lyrics.verses.map((verse, index) => {
          const isActive = index === currentVerseIndex
          const isPast = index < currentVerseIndex

          return (
            <div
              key={verse.index}
              ref={isActive ? activeVerseRef : undefined}
              className={cn(
                "text-center transition-all duration-300",
                isActive && "scale-105",
                isPast && "opacity-30",
                !isActive && !isPast && "opacity-50"
              )}
              style={{
                fontSize: isActive
                  ? Math.max(24, fontSize * 0.75)
                  : Math.max(18, fontSize * 0.5),
              }}
            >
              {/* Verse number */}
              <div
                className="mb-2 opacity-40"
                style={{ fontSize: Math.max(12, fontSize * 0.2) }}
              >
                Verse {index + 1}
              </div>

              {/* Verse content */}
              <div className="leading-relaxed whitespace-pre-line">
                {verse.content}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
