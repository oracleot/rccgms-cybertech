"use client"

/**
 * Speech recognition with real states. Wraps the browser's SpeechRecognition
 * (Chrome/Edge; it streams audio to Google's service and needs internet) and
 * turns what it hears into structured Bible references via the same parser
 * the typed field uses. The raw transcript is kept for diagnostics only.
 *
 * Listening starts only when start() is called — never on load.
 *
 * Known limits of this API, stated rather than papered over:
 *  - it always uses the operating system's default microphone; there is no
 *    way to pick a device. Change the default in Windows Sound settings.
 *  - continuous mode ends itself after a stretch of silence; while the
 *    operator wants to listen we restart it, and report if we can't.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { detectVoiceReferences, type VoiceReference } from "@/lib/bible/voice-reference"

export type ListenStatus =
  | "unsupported"
  | "ready"
  | "listening"
  | "stopped"
  | "permission-denied"
  | "no-audio"
  | "disconnected"
  | "unavailable"
  | "error"

export const STATUS_LABEL: Record<ListenStatus, string> = {
  unsupported: "Speech recognition unavailable",
  ready: "Ready",
  listening: "Listening",
  stopped: "Stopped",
  "permission-denied": "Microphone permission denied",
  "no-audio": "No audio input",
  disconnected: "Input disconnected",
  unavailable: "Speech recognition unavailable",
  error: "Recognition error",
}

interface RecognitionLike extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: RecognitionResultEvent) => void) | null
  onend: (() => void) | null
  onerror: ((e: Event & { error?: string; message?: string }) => void) | null
  onstart: (() => void) | null
}

interface RecognitionResultEvent extends Event {
  resultIndex: number
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>
}

type RecognitionCtor = new () => RecognitionLike

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

const TRANSCRIPT_MAX = 2000
const RESTART_DELAY_MS = 300
const MAX_SILENT_RESTARTS = 40

export function useListening(lang: string) {
  const [supported, setSupported] = useState(false)
  const [status, setStatus] = useState<ListenStatus>("unsupported")
  const [detail, setDetail] = useState<string | null>(null)
  const [transcript, setTranscript] = useState("")

  const recRef = useRef<RecognitionLike | null>(null)
  const intentRef = useRef(false)
  const finalRef = useRef("")
  const restartsRef = useRef(0)
  const restartTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const langRef = useRef(lang)

  useEffect(() => {
    const ok = getCtor() !== null
    setSupported(ok)
    setStatus(ok ? "ready" : "unsupported")
  }, [])

  const fail = useCallback((s: ListenStatus, why: string | null) => {
    intentRef.current = false
    setStatus(s)
    setDetail(why)
  }, [])

  const spin = useCallback(() => {
    const Ctor = getCtor()
    if (!Ctor) {
      fail("unavailable", "This browser has no speech recognition. Use Chrome or Edge.")
      return
    }
    let rec: RecognitionLike
    try {
      rec = new Ctor()
    } catch {
      fail("unavailable", "Speech recognition could not be started in this browser.")
      return
    }
    rec.continuous = true
    rec.interimResults = true
    rec.lang = langRef.current

    rec.onstart = () => {
      setStatus("listening")
      setDetail(null)
    }
    rec.onresult = (e) => {
      let interim = ""
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        const text = r[0]?.transcript ?? ""
        if (r.isFinal) finalRef.current = `${finalRef.current} ${text}`.trim().slice(-TRANSCRIPT_MAX)
        else interim += text
      }
      restartsRef.current = 0
      setTranscript(`${finalRef.current} ${interim}`.trim().slice(-TRANSCRIPT_MAX))
    }
    rec.onerror = (e) => {
      const code = e.error ?? "unknown"
      switch (code) {
        case "not-allowed":
        case "service-not-allowed":
          fail("permission-denied", "Allow microphone access for this site, then press Start again.")
          break
        case "audio-capture":
          fail("no-audio", "No microphone was found. Check the input is connected and set as default in Windows Sound settings.")
          break
        case "network":
          fail("error", "The speech service needs an internet connection.")
          break
        case "no-speech":
        case "aborted":
          // Silence or our own restart — not a fault. onend handles the restart.
          break
        default:
          fail("error", `Recognition error: ${code}${e.message ? ` — ${e.message}` : ""}`)
      }
    }
    rec.onend = () => {
      recRef.current = null
      if (!intentRef.current) {
        setStatus((s) => (s === "listening" ? "stopped" : s))
        return
      }
      // Chrome ends continuous recognition after silence; keep going while the operator wants us to.
      if (restartsRef.current++ > MAX_SILENT_RESTARTS) {
        fail("error", "Recognition kept stopping — check the microphone is receiving audio, then press Start again.")
        return
      }
      restartTimer.current = setTimeout(spin, RESTART_DELAY_MS)
    }

    try {
      rec.start()
      recRef.current = rec
    } catch {
      fail("error", "Recognition could not start. Try again.")
    }
  }, [fail])

  const start = useCallback(() => {
    if (!supported) {
      fail("unavailable", "This browser has no speech recognition. Use Chrome or Edge.")
      return
    }
    if (intentRef.current) return
    intentRef.current = true
    restartsRef.current = 0
    setDetail(null)
    spin()
  }, [supported, spin, fail])

  const stop = useCallback(() => {
    intentRef.current = false
    if (restartTimer.current) {
      clearTimeout(restartTimer.current)
      restartTimer.current = null
    }
    const rec = recRef.current
    recRef.current = null
    try {
      rec?.stop()
    } catch {
      // already stopped
    }
    setStatus("stopped")
  }, [])

  const clearTranscript = useCallback(() => {
    finalRef.current = ""
    setTranscript("")
  }, [])

  // Language change while listening: restart so the recogniser uses it.
  useEffect(() => {
    langRef.current = lang
    if (intentRef.current && recRef.current) {
      const rec = recRef.current
      recRef.current = null
      try {
        rec.abort()
      } catch {
        // ignore
      }
      restartTimer.current = setTimeout(spin, RESTART_DELAY_MS)
    }
  }, [lang, spin])

  // If every audio input disappears mid-service, say so instead of listening to nothing.
  useEffect(() => {
    const md = typeof navigator !== "undefined" ? navigator.mediaDevices : undefined
    if (!md?.addEventListener) return
    const onChange = async () => {
      if (!intentRef.current) return
      try {
        const devices = await md.enumerateDevices()
        if (!devices.some((d) => d.kind === "audioinput")) {
          stop()
          fail("disconnected", "The microphone was disconnected.")
        }
      } catch {
        // enumerate can fail without permission; nothing to report
      }
    }
    md.addEventListener("devicechange", onChange)
    return () => md.removeEventListener("devicechange", onChange)
  }, [stop, fail])

  useEffect(() => {
    return () => {
      intentRef.current = false
      if (restartTimer.current) clearTimeout(restartTimer.current)
      try {
        recRef.current?.abort()
      } catch {
        // ignore
      }
    }
  }, [])

  const refs = useMemo<VoiceReference[]>(() => {
    if (!transcript) return []
    const all = detectVoiceReferences(transcript)
    return all.slice(-6)
  }, [transcript])

  return { supported, status, detail, transcript, refs, start, stop, clearTranscript, listening: status === "listening" }
}

export type Listening = ReturnType<typeof useListening>
