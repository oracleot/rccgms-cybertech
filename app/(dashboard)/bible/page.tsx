"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  BookOpen,
  Search,
  Trash2,
  Loader2,
  MonitorPlay,
  MonitorOff,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Download,
  Tv2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { parseReferenceInput } from "@/lib/bible/parse-reference"
import { TRANSLATIONS, type TranslationId } from "@/lib/bible/fetch-passage"
import { loadPassage, prefetchTranslationsWhenIdle, PassageUnavailableError } from "@/lib/bible/passage-store"
import { displayReference, verseId, verseLabel } from "@/lib/bible/format"
import type { DisplaySyncMessage, BiblePassagePayload } from "@/types/rundown"
import { createClient } from "@/lib/supabase/client"
import { obsChannelName } from "@/lib/bible/obs-channel"
import { ListeningPanel } from "@/components/bible/listening/listening-panel"
import { useListening } from "@/components/bible/listening/use-listening"

/** What can be put on screen: the API path, and the reference it's labelled with. */
interface SendTarget {
  apiPath: string
  reference: string
}

const BROADCAST_CHANNEL = "rundown-display"

// ---------------------------------------------------------------------------
// Accent / language options for Web Speech API
// ---------------------------------------------------------------------------
const ACCENTS = [
  { id: "en-NG", label: "Nigerian English" },
  { id: "en-GH", label: "Ghanaian English" },
  { id: "en-GB", label: "British English" },
  { id: "en-US", label: "American English" },
  { id: "en-ZA", label: "South African" },
  { id: "en-AU", label: "Australian" },
  { id: "en-IN", label: "Indian English" },
] as const
type AccentId = (typeof ACCENTS)[number]["id"]

// ---------------------------------------------------------------------------
// Mishearing log — persisted to localStorage for later training
// ---------------------------------------------------------------------------
const MISHEARING_KEY = "bible-mishearing-log"

interface MishearingEntry {
  heard: string        // raw transcript fragment
  detected: string     // what our model detected (or "" if nothing)
  corrected: string    // what the operator typed manually
  ts: number
}

function loadMishearings(): MishearingEntry[] {
  try {
    return JSON.parse(localStorage.getItem(MISHEARING_KEY) ?? "[]")
  } catch {
    return []
  }
}

function saveMishearing(entry: MishearingEntry) {
  try {
    const existing = loadMishearings()
    localStorage.setItem(MISHEARING_KEY, JSON.stringify([...existing, entry].slice(-200)))
  } catch {
    // localStorage unavailable — silently skip
  }
}

function useBibleBroadcast() {
  const channelRef = useRef<BroadcastChannel | null>(null)

  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return
    channelRef.current = new BroadcastChannel(BROADCAST_CHANNEL)
    return () => {
      channelRef.current?.close()
      channelRef.current = null
    }
  }, [])

  const sendPassage = useCallback((payload: BiblePassagePayload) => {
    const msg: DisplaySyncMessage = { type: "BIBLE_PASSAGE", payload }
    channelRef.current?.postMessage(msg)
  }, [])

  const clearPassage = useCallback(() => {
    const msg: DisplaySyncMessage = { type: "BIBLE_CLEAR", payload: {} }
    channelRef.current?.postMessage(msg)
  }, [])

  return { sendPassage, clearPassage }
}

export default function BiblePage() {
  const [translation, setTranslation] = useState<TranslationId>("kjv")
  const [accent, setAccent] = useState<AccentId>("en-NG")
  const [manualInput, setManualInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [loadingRef, setLoadingRef] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [onScreenPassage, setOnScreenPassage] = useState<BiblePassagePayload | null>(null)
  const [mishearings, setMishearings] = useState<MishearingEntry[]>([])
  const [showTraining, setShowTraining] = useState(false)

  // Listening starts only when the operator presses Start — never on load.
  const listening = useListening(accent)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const obsChannelRef = useRef<any>(null)
  const { sendPassage, clearPassage } = useBibleBroadcast()

  // Set up Supabase Realtime channel for OBS broadcast
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(obsChannelName(), {
      config: { broadcast: { self: false } },
    })
    channel.subscribe()
    obsChannelRef.current = channel
    return () => {
      channel.unsubscribe()
      obsChannelRef.current = null
    }
  }, [])

  // Load mishearing log from localStorage on mount
  useEffect(() => {
    setMishearings(loadMishearings())
  }, [])

  const sendRefToScreen = useCallback(
    async (ref: SendTarget) => {
      setLoadingRef(ref.reference)
      setIsLoading(true)
      setError(null)
      try {
        const passage = await loadPassage(ref.apiPath, translation, "high")
        prefetchTranslationsWhenIdle(ref.apiPath, translation, passage.verses.length)
        const payload: BiblePassagePayload = {
          reference: passage.reference,
          text: passage.text,
          translation: passage.translationId,
          translationName: passage.translationName,
          verses: passage.verses,
          verseNumber: passage.verses.length === 1 ? passage.verses[0]?.verse : undefined,
          focusId: passage.verses.length === 1 ? verseId(passage.verses[0]) : undefined,
        }
        sendPassage(payload)
        setOnScreenPassage(payload)
        // Broadcast to OBS overlay via Supabase Realtime
        obsChannelRef.current?.send({
          type: "broadcast",
          event: "passage",
          payload,
        })
      } catch (err) {
        setError(
          err instanceof PassageUnavailableError
            ? err.message
            : "Could not fetch passage. Check the reference and try again."
        )
      } finally {
        setIsLoading(false)
        setLoadingRef(null)
      }
    },
    [translation, sendPassage]
  )

  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    const query = manualInput.trim()
    if (!query) return

    // Typed while listening found nothing: that's a mishearing worth keeping for training
    if (listening.transcript && listening.refs.length === 0) {
      const entry: MishearingEntry = {
        heard: listening.transcript.slice(-300),
        detected: "",
        corrected: query,
        ts: Date.now(),
      }
      saveMishearing(entry)
      setMishearings(loadMishearings())
    }

    // Only a parsed reference ever reaches the API — never the raw text
    const parsed = parseReferenceInput(query)
    if (!parsed.best) {
      setError(`"${query}" isn't a Bible reference. Try a form like John 3:16, ps 23 or 2kings2 3 5.`)
      return
    }
    if (parsed.best.confidence === "low") {
      setError(`Not sure what "${query}" means${parsed.best.note ? ` — ${parsed.best.note}` : ""}. Be more specific.`)
      return
    }
    setManualInput("")
    await sendRefToScreen({ apiPath: parsed.best.apiPath, reference: parsed.best.reference })
  }

  const handleClear = useCallback(() => {
    clearPassage()
    setOnScreenPassage(null)
    obsChannelRef.current?.send({ type: "broadcast", event: "clear", payload: {} })
  }, [clearPassage])

  // Send a single numbered verse from an already-loaded passage
  const sendVerseToScreen = useCallback(
    (base: BiblePassagePayload, verseEntry: { book?: string; chapter?: number; verse: number; text: string }) => {
      const payload: BiblePassagePayload = {
        ...base,
        text: verseEntry.text,
        verseNumber: verseEntry.verse,
        focusId: verseId(verseEntry),
      }
      sendPassage(payload)
      setOnScreenPassage(payload)
      obsChannelRef.current?.send({ type: "broadcast", event: "passage", payload })
    },
    [sendPassage]
  )

  // Step to the previous/next verse of the passage currently on screen
  const stepVerse = useCallback(
    (delta: number) => {
      const verses = onScreenPassage?.verses
      if (!onScreenPassage || !verses?.length) return
      const current = verses.findIndex((v) =>
        onScreenPassage.focusId ? verseId(v) === onScreenPassage.focusId : v.verse === onScreenPassage.verseNumber
      )
      const next = current < 0 ? (delta > 0 ? 0 : verses.length - 1) : current + delta
      if (next < 0 || next >= verses.length) return
      sendVerseToScreen(onScreenPassage, verses[next])
    },
    [onScreenPassage, sendVerseToScreen]
  )

  return (
    <div className="container max-w-3xl mx-auto py-8 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-violet-600" />
          <div>
            <h1 className="text-2xl font-bold">Bible Reader</h1>
            <p className="text-sm text-muted-foreground">
              Displays Bible passages on the projection screen in real time
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs hidden sm:flex"
            onClick={() => {
              const url = `${window.location.origin}/bible/obs`
              navigator.clipboard.writeText(url).catch(() => {})
              window.open(url, "_blank", "noopener,noreferrer")
            }}
            title="Open the OBS Bible display (add it as a Browser Source in OBS)"
          >
            <Tv2 className="h-3.5 w-3.5" />
            OBS Display
          </Button>
          <Select value={accent} onValueChange={(v) => setAccent(v as AccentId)}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Accent" />
            </SelectTrigger>
            <SelectContent>
              {ACCENTS.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={translation}
            onValueChange={(v) => setTranslation(v as TranslationId)}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRANSLATIONS.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Voice detection — structured references in, only a parsed reference ever goes to the API */}
      <ListeningPanel
        listening={listening}
        onSend={(ref) => void sendRefToScreen({ apiPath: ref.apiPath, reference: ref.reference })}
        sending={loadingRef}
      />

      {/* Manual Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Manual Reference</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <form onSubmit={handleManualSearch} className="flex gap-2">
            <Input
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder='e.g.  "John 3:16"  or  "Psalm 23"  or  "1 Cor 13:4-7"'
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={isLoading || !manualInput.trim()}
              className="gap-2 shrink-0"
            >
              {isLoading && loadingRef === null ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Search &amp; Send</span>
              <span className="sm:hidden">Send</span>
            </Button>
          </form>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </CardContent>
      </Card>

      {/* Currently on screen */}
      {onScreenPassage ? (
        <Card
          className={cn(
            "border-2 border-violet-200 dark:border-violet-800",
            "bg-violet-50/50 dark:bg-violet-950/20"
          )}
        >
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 min-w-0">
                <MonitorPlay className="h-4 w-4 text-violet-600 dark:text-violet-400 shrink-0 animate-pulse" />
                <CardTitle className="text-base text-violet-700 dark:text-violet-400 truncate">
                  On Screen Now
                </CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                className="gap-2 text-destructive hover:text-destructive border-destructive/30 hover:border-destructive shrink-0"
              >
                <MonitorOff className="h-4 w-4" />
                Clear Screen
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xl font-bold font-mono">
                {displayReference(
                  onScreenPassage.reference,
                  onScreenPassage.verseNumber,
                  onScreenPassage.verses,
                  onScreenPassage.focusId
                )}
              </span>
              <Badge variant="outline" className="text-xs">
                {onScreenPassage.translationName}
              </Badge>
            </div>
            <blockquote className="border-l-4 border-violet-400 pl-4 text-muted-foreground italic leading-relaxed text-sm">
              {onScreenPassage.text}
            </blockquote>

            {/* Verse navigation — click any verse to send just that verse */}
            {onScreenPassage.verses && onScreenPassage.verses.length > 1 && (
              <div className="pt-1 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Verses — click to send
                  </p>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => stepVerse(-1)}
                      title="Previous verse"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => stepVerse(1)}
                      title="Next verse"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="max-h-72 overflow-y-auto rounded-md border divide-y bg-background/60">
                  {onScreenPassage.verses.map((v) => {
                    const active = onScreenPassage.focusId
                      ? onScreenPassage.focusId === verseId(v)
                      : onScreenPassage.verseNumber === v.verse
                    return (
                      <button
                        key={verseId(v)}
                        onClick={() => sendVerseToScreen(onScreenPassage, v)}
                        className={cn(
                          "flex w-full gap-3 px-3 py-2 text-left text-sm transition-colors",
                          active
                            ? "bg-violet-100 dark:bg-violet-900/40"
                            : "hover:bg-muted"
                        )}
                      >
                        <span
                          className={cn(
                            "font-mono text-xs font-bold shrink-0 pt-0.5",
                            active
                              ? "text-violet-700 dark:text-violet-300"
                              : "text-muted-foreground"
                          )}
                        >
                          {verseLabel(v)}
                        </span>
                        <span className="leading-relaxed">{v.text}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <BookOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            No passage on screen yet. Use voice detection or type a reference above.
          </p>
        </div>
      )}

      {/* Quick reference card */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Common Formats Recognised
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              "John 3:16",
              "Psalm 23",
              "1 Cor 13:4-7",
              "Genesis 1:1",
              "Revelation 3:20",
              "Matt 5:3-12",
            ].map((ex) => (
              <button
                key={ex}
                onClick={() => {
                  const best = parseReferenceInput(ex).best
                  if (best) void sendRefToScreen({ apiPath: best.apiPath, reference: best.reference })
                }}
                disabled={isLoading}
                className={cn(
                  "text-left rounded-md px-3 py-2 text-sm font-mono",
                  "bg-background border hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30",
                  "transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none"
                )}
              >
                {ex}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Accent Training Data — collects mishearings for model improvement */}
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <button
            className="flex items-center justify-between w-full text-left"
            onClick={() => setShowTraining((v) => !v)}
          >
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Accent Training Data
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {mishearings.length} mishearing{mishearings.length !== 1 ? "s" : ""} logged
                {mishearings.length > 0 ? " — review to improve accuracy" : ""}
              </p>
            </div>
            {showTraining ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
          </button>
        </CardHeader>

        {showTraining && (
          <CardContent className="space-y-4 pt-0">
            <p className="text-xs text-muted-foreground">
              When voice detection misses a reference and you type it manually, the transcript
              is saved here. Share this with the developer to improve accent recognition for
              your congregation.
            </p>

            {mishearings.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                No mishearings recorded yet. They appear here automatically when you manually
                correct a missed reference.
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {[...mishearings].reverse().map((entry, i) => (
                  <div key={i} className="rounded-md border p-3 text-xs space-y-1 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-destructive">Heard (wrong):</span>
                      <span className="text-muted-foreground">
                        {new Date(entry.ts).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="font-mono text-muted-foreground line-clamp-2">{entry.heard}</p>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      Corrected to:
                    </span>
                    <p className="font-mono font-medium">{entry.corrected}</p>
                  </div>
                ))}
              </div>
            )}

            {mishearings.length > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-xs"
                  onClick={() => {
                    const json = JSON.stringify(mishearings, null, 2)
                    const blob = new Blob([json], { type: "application/json" })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement("a")
                    a.href = url
                    a.download = `bible-mishearings-${Date.now()}.json`
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                >
                  <Download className="h-3 w-3" />
                  Export for training
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs text-destructive border-destructive/30 hover:border-destructive hover:text-destructive"
                  onClick={() => {
                    localStorage.removeItem(MISHEARING_KEY)
                    setMishearings([])
                  }}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear log
                </Button>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  )
}
