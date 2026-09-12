"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  BookOpen,
  Mic,
  MicOff,
  Search,
  Send,
  Trash2,
  Loader2,
  MonitorPlay,
  MonitorOff,
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
import { detectBibleReferences, type BibleReference } from "@/lib/bible/detect-references"
import { fetchBiblePassage, TRANSLATIONS, type TranslationId } from "@/lib/bible/fetch-passage"
import type { DisplaySyncMessage, BiblePassagePayload } from "@/types/rundown"

// Extend Window for vendor-prefixed Speech Recognition (not in standard TS DOM types)
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}

const BROADCAST_CHANNEL = "rundown-display"

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
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [detectedRefs, setDetectedRefs] = useState<BibleReference[]>([])
  const [manualInput, setManualInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [loadingRef, setLoadingRef] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [onScreenPassage, setOnScreenPassage] = useState<BiblePassagePayload | null>(null)
  const [speechSupported, setSpeechSupported] = useState(false)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const { sendPassage, clearPassage } = useBibleBroadcast()

  useEffect(() => {
    setSpeechSupported(
      typeof window !== "undefined" &&
        ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
    )
  }, [])

  // Detect references whenever transcript changes
  useEffect(() => {
    if (!transcript) {
      setDetectedRefs([])
      return
    }
    const refs = detectBibleReferences(transcript)
    // Deduplicate and keep the 6 most recent unique references
    const unique = refs.filter(
      (ref, i, arr) => arr.findIndex((r) => r.reference === ref.reference) === i
    )
    setDetectedRefs(unique.slice(-6))
  }, [transcript])

  const startListening = useCallback(() => {
    if (!speechSupported) return
    const SpeechRecognitionCls = window.SpeechRecognition ?? window.webkitSpeechRecognition
    const recognition = new SpeechRecognitionCls()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = "en-GB"

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let full = ""
      for (let i = 0; i < event.results.length; i++) {
        full += event.results[i]?.[0]?.transcript ?? ""
        full += " "
      }
      // Keep last 600 chars to avoid runaway growth
      setTranscript(full.slice(-600))
    }

    recognition.onend = () => {
      setIsListening(false)
      recognitionRef.current = null
    }
    recognition.onerror = () => {
      setIsListening(false)
      recognitionRef.current = null
    }

    recognition.start()
    recognitionRef.current = recognition
    setIsListening(true)
    setTranscript("")
    setDetectedRefs([])
  }, [speechSupported])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setIsListening(false)
  }, [])

  const sendRefToScreen = useCallback(
    async (ref: BibleReference | string) => {
      const label = typeof ref === "string" ? ref : ref.reference
      setLoadingRef(label)
      setIsLoading(true)
      setError(null)
      try {
        const apiPath = typeof ref === "string" ? ref : ref.apiPath
        const passage = await fetchBiblePassage(apiPath, translation)
        const payload: BiblePassagePayload = {
          reference: passage.reference,
          text: passage.text,
          translation: passage.translationId,
          translationName: passage.translationName,
        }
        sendPassage(payload)
        setOnScreenPassage(payload)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not fetch passage. Check the reference and try again.")
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
    setManualInput("")
    const refs = detectBibleReferences(query)
    if (refs.length > 0) {
      await sendRefToScreen(refs[0])
    } else {
      // Treat raw input as an API path — user might have typed "john 3:16" etc.
      await sendRefToScreen(query.toLowerCase().replace(/\s+/g, "+"))
    }
  }

  const handleClear = useCallback(() => {
    clearPassage()
    setOnScreenPassage(null)
  }, [clearPassage])

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

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden sm:block">Translation</span>
          <Select
            value={translation}
            onValueChange={(v) => setTranslation(v as TranslationId)}
          >
            <SelectTrigger className="w-48">
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

      {/* Voice Detection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">AI Voice Detection</CardTitle>
            {speechSupported ? (
              <Button
                variant={isListening ? "destructive" : "default"}
                onClick={isListening ? stopListening : startListening}
                className="gap-2"
              >
                {isListening ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
                {isListening ? "Stop Listening" : "Start Listening"}
              </Button>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                Speech recognition requires Chrome or Edge
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!speechSupported && (
            <p className="text-sm text-muted-foreground">
              Open this page in Google Chrome or Microsoft Edge to enable microphone-based
              automatic detection. Manual search below works in all browsers.
            </p>
          )}

          {speechSupported && !isListening && !transcript && (
            <p className="text-sm text-muted-foreground">
              Click <strong>Start Listening</strong> and the AI will automatically detect
              Bible references as the pastor speaks — "John 3:16", "Psalm 23", "First
              Corinthians 13 verse 4" — and offer to put them on screen instantly.
            </p>
          )}

          {isListening && (
            <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              Listening — speak naturally
            </div>
          )}

          {transcript && (
            <div className="rounded-md bg-muted/50 border p-3 text-sm text-muted-foreground leading-relaxed font-mono max-h-28 overflow-y-auto">
              {transcript.slice(-300)}
            </div>
          )}

          {detectedRefs.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Detected References
              </p>
              <div className="flex flex-wrap gap-2">
                {detectedRefs.map((ref) => (
                  <div key={ref.reference} className="flex items-center gap-1">
                    <Badge variant="secondary" className="font-mono text-sm">
                      {ref.reference}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 text-xs"
                      onClick={() => sendRefToScreen(ref)}
                      disabled={isLoading}
                    >
                      {loadingRef === ref.reference ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Send className="h-3 w-3" />
                      )}
                      Send
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
                {onScreenPassage.reference}
              </span>
              <Badge variant="outline" className="text-xs">
                {onScreenPassage.translationName}
              </Badge>
            </div>
            <blockquote className="border-l-4 border-violet-400 pl-4 text-muted-foreground italic leading-relaxed text-sm">
              {onScreenPassage.text}
            </blockquote>
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
                onClick={() => sendRefToScreen(ex.toLowerCase().replace(/\s+/g, "+"))}
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
    </div>
  )
}
