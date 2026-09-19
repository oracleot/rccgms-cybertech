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
 *
 * Two real desktop failure modes drove the shape of the retry logic below
 * (found from an operator's report: mic showed connected, the level meter
 * moved, but recognition never produced a reference, and the "listening"
 * indicator sometimes vanished after a few seconds):
 *
 *  1. Restarting too soon after Chrome ends a session can throw
 *     InvalidStateError synchronously from rec.start() — the previous
 *     session's audio pipe hasn't released yet. The old code treated any
 *     start() throw as terminal, so one unlucky restart killed listening
 *     outright. It's now retried with backoff like any other transient
 *     failure, and only escalated after several tries in a row fail.
 *  2. A silence-triggered onend/restart is NORMAL — Chrome does this
 *     periodically even while genuinely working — and must never count
 *     toward giving up. If recognition is bound to a different physical
 *     device than the operator is speaking into (a real possibility: the
 *     level meter can be pointed at any device, but recognition always
 *     uses the OS/browser default), it will cycle through these clean
 *     restarts indefinitely without ever producing a result. That is a
 *     configuration problem to surface via diagnostics, not a reason to
 *     stop trying.
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
export const CLEAN_RESTART_DELAY_MS = 300 // a silence-triggered onend, with no error — Chrome's normal cadence
const EVENT_LOG_MAX = 30
export const MAX_CONSECUTIVE_FAILURES = 6 // real failures in a row before giving up

/** Backoff for actual failures: 500ms, 1s, 2s, 4s, 8s, 8s... giving Windows audio time to settle. */
export function failureBackoffMs(consecutiveFailures: number): number {
  return Math.min(500 * 2 ** Math.max(0, consecutiveFailures - 1), 8000)
}

export type RecognitionEndKind = "clean" | "failure"

export type RetryDecision =
  | { action: "retry"; delayMs: number; consecutiveFailures: number }
  | { action: "give-up"; consecutiveFailures: number }

/**
 * What to do after a recognition session ends, given why and how many real
 * failures have happened in a row. This is the one place that decides "keep
 * trying" vs "give up" — the hook below only wires it up — so the actual
 * desktop bug this was built to fix (dying on the first InvalidStateError
 * right after an ordinary restart) is directly testable without a browser:
 * see scripts/check-listening-retry.ts.
 *
 * A "clean" end — plain silence, or Chrome's own periodic cycling, or our own
 * abort() on stop/language-change — is not a failure and always retries; it
 * must never count toward giving up, or a healthy long session eventually
 * dies on its own, and — worse — this is also what a device mismatch looks
 * like (recognition legitimately hearing silence from the wrong input),
 * which is a configuration problem to surface via diagnostics, not a reason
 * to stop listening. Only start() throwing, or onerror reporting something
 * other than "no-speech"/"aborted", count as failures.
 */
export function decideRetry(kind: RecognitionEndKind, consecutiveFailures: number): RetryDecision {
  if (kind === "clean") {
    return { action: "retry", delayMs: CLEAN_RESTART_DELAY_MS, consecutiveFailures: 0 }
  }
  const next = consecutiveFailures + 1
  if (next > MAX_CONSECUTIVE_FAILURES) {
    return { action: "give-up", consecutiveFailures: next }
  }
  return { action: "retry", delayMs: failureBackoffMs(next), consecutiveFailures: next }
}

export type ListenEventType = "start" | "result" | "end-clean" | "end-after-error" | "error" | "start-failed" | "gave-up"

export interface ListenEvent {
  at: number
  type: ListenEventType
  detail?: string
}

export interface ListenDiagnostics {
  events: ListenEvent[]
  /** Every restart since the last user-initiated Start — clean and after-error alike. */
  restartCount: number
  lastInterim: string
  lastFinal: string
  lastResultAt: number | null
  /** When the current (or most recent) recognition session actually started. */
  startedAt: number | null
}

export function useListening(lang: string) {
  const [supported, setSupported] = useState(false)
  const [status, setStatus] = useState<ListenStatus>("unsupported")
  const [detail, setDetail] = useState<string | null>(null)
  const [transcript, setTranscript] = useState("")
  const [diagnostics, setDiagnostics] = useState<ListenDiagnostics>({
    events: [],
    restartCount: 0,
    lastInterim: "",
    lastFinal: "",
    lastResultAt: null,
    startedAt: null,
  })

  const recRef = useRef<RecognitionLike | null>(null)
  const intentRef = useRef(false)
  const finalRef = useRef("")
  const restartCountRef = useRef(0)
  const consecutiveFailuresRef = useRef(0)
  const lastErrorCodeRef = useRef<string | null>(null)
  const restartTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const langRef = useRef(lang)
  const eventsRef = useRef<ListenEvent[]>([])

  useEffect(() => {
    const ok = getCtor() !== null
    setSupported(ok)
    setStatus(ok ? "ready" : "unsupported")
  }, [])

  const logEvent = useCallback((type: ListenEventType, eventDetail?: string) => {
    const entry: ListenEvent = { at: Date.now(), type, detail: eventDetail }
    eventsRef.current = [...eventsRef.current, entry].slice(-EVENT_LOG_MAX)
    setDiagnostics((d) => ({ ...d, events: eventsRef.current }))
  }, [])

  const fail = useCallback(
    (s: ListenStatus, why: string | null, eventDetail?: string) => {
      intentRef.current = false
      setStatus(s)
      setDetail(why)
      logEvent("gave-up", eventDetail ?? why ?? s)
    },
    [logEvent]
  )

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
      consecutiveFailuresRef.current = 0
      setStatus("listening")
      setDetail(null)
      setDiagnostics((d) => ({ ...d, startedAt: Date.now() }))
      logEvent("start")
    }
    rec.onresult = (e) => {
      let interim = ""
      let final = ""
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        const text = r[0]?.transcript ?? ""
        if (r.isFinal) {
          final = text
          finalRef.current = `${finalRef.current} ${text}`.trim().slice(-TRANSCRIPT_MAX)
        } else {
          interim += text
        }
      }
      restartCountRef.current = 0
      const merged = `${finalRef.current} ${interim}`.trim().slice(-TRANSCRIPT_MAX)
      setTranscript(merged)
      setDiagnostics((d) => ({
        ...d,
        lastResultAt: Date.now(),
        lastInterim: interim || d.lastInterim,
        lastFinal: final || d.lastFinal,
      }))
      logEvent("result", final ? `final: "${final.trim()}"` : `interim: "${interim.trim()}"`)
    }
    rec.onerror = (e) => {
      const code = e.error ?? "unknown"
      lastErrorCodeRef.current = code
      logEvent("error", code)
      switch (code) {
        case "not-allowed":
        case "service-not-allowed":
          // An explicit permission decision — retrying won't change it.
          fail("permission-denied", "Allow microphone access for this site, then press Start again.", code)
          break
        case "no-speech":
        case "aborted":
          // Silence, or our own restart/abort — not a fault. onend handles what happens next.
          break
        default:
          // audio-capture, network, and anything unrecognised: treat as transient and let
          // onend's retry path decide whether to back off or give up, rather than dying here.
          break
      }
    }
    rec.onend = () => {
      recRef.current = null
      if (!intentRef.current) {
        setStatus((s) => (s === "listening" ? "stopped" : s))
        return
      }

      const errorCode = lastErrorCodeRef.current
      lastErrorCodeRef.current = null
      const isFailure = !!errorCode && errorCode !== "no-speech" && errorCode !== "aborted"
      logEvent(isFailure ? "end-after-error" : "end-clean", errorCode ?? undefined)

      const decision = decideRetry(isFailure ? "failure" : "clean", consecutiveFailuresRef.current)
      consecutiveFailuresRef.current = decision.consecutiveFailures
      restartCountRef.current++
      setDiagnostics((d) => ({ ...d, restartCount: restartCountRef.current }))

      if (decision.action === "give-up") {
        const message =
          errorCode === "audio-capture"
            ? "No microphone was found. Check the input is connected and set as default in Windows Sound settings."
            : errorCode === "network"
              ? "The speech service needs an internet connection."
              : errorCode
                ? `Recognition error: ${errorCode}`
                : "Recognition kept failing. Try Stop then Start again."
        fail("error", message, `${errorCode ?? "unknown"} × ${decision.consecutiveFailures}`)
        return
      }
      restartTimer.current = setTimeout(spin, decision.delayMs)
    }

    try {
      rec.start()
      recRef.current = rec
    } catch (e) {
      // The most common desktop failure: restarting before the previous session's audio pipe
      // has released throws InvalidStateError synchronously. This used to be treated as
      // terminal — one unlucky restart silently killed listening. Retry with backoff instead.
      const name = e instanceof Error ? e.name : "unknown"
      logEvent("start-failed", name)
      const decision = decideRetry("failure", consecutiveFailuresRef.current)
      consecutiveFailuresRef.current = decision.consecutiveFailures
      if (decision.action === "give-up") {
        fail(
          "error",
          "Recognition keeps failing to (re)start. This can happen right after switching microphones or with some audio drivers — try Stop then Start again.",
          `${name} × ${decision.consecutiveFailures}`
        )
        return
      }
      restartTimer.current = setTimeout(spin, decision.delayMs)
    }
  }, [fail, logEvent])

  const start = useCallback(() => {
    if (!supported) {
      fail("unavailable", "This browser has no speech recognition. Use Chrome or Edge.")
      return
    }
    if (intentRef.current) return
    intentRef.current = true
    restartCountRef.current = 0
    consecutiveFailuresRef.current = 0
    lastErrorCodeRef.current = null
    eventsRef.current = []
    setDiagnostics({ events: [], restartCount: 0, lastInterim: "", lastFinal: "", lastResultAt: null, startedAt: null })
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
      restartTimer.current = setTimeout(spin, CLEAN_RESTART_DELAY_MS)
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

  // Debounced reference detection: wait for the transcript to stabilise before
  // committing new references so an incomplete interim like "John three" doesn't
  // fire prematurely while the speaker is still saying "sixteen".
  const [stableTranscript, setStableTranscript] = useState("")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!transcript) {
      setStableTranscript("")
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setStableTranscript(transcript), 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [transcript])

  // Track which references have already been surfaced in this listening session
  // to suppress duplicates from the accumulating transcript. A reference is
  // "consumed" when displayed; if the speaker says the same reference again as
  // a genuinely new utterance (new final text containing it), it re-appears.
  const lastFinalLenRef = useRef(0)
  const consumedRefsRef = useRef(new Set<string>())

  const refs = useMemo<VoiceReference[]>(() => {
    if (!stableTranscript) return []
    const all = detectVoiceReferences(stableTranscript)

    // Reset consumed set when a new final segment arrives (the speaker said
    // something new), so a genuinely repeated reference can fire again.
    const currentFinalLen = finalRef.current.length
    if (currentFinalLen > lastFinalLenRef.current + 10) {
      consumedRefsRef.current.clear()
    }
    lastFinalLenRef.current = currentFinalLen

    const fresh = all.filter((r) => !consumedRefsRef.current.has(r.reference))
    for (const r of fresh) consumedRefsRef.current.add(r.reference)
    return fresh.slice(-6)
  }, [stableTranscript])

  // Reset consumed refs when listening starts fresh
  const startWrapped = useCallback(() => {
    consumedRefsRef.current.clear()
    lastFinalLenRef.current = 0
    start()
  }, [start])

  return {
    supported,
    status,
    detail,
    transcript,
    refs,
    start: startWrapped,
    stop,
    clearTranscript,
    listening: status === "listening",
    diagnostics,
  }
}

export type Listening = ReturnType<typeof useListening>
