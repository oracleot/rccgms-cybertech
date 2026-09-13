"use client"

/**
 * The one place that answers "is the level meter actually showing what
 * recognition hears?" — and formats the raw event log from useListening
 * into something a human can read. Both the dock's audio popover and the
 * Bible Reader's audio panel call this; only their markup differs.
 *
 * The level meter can be pointed at any getUserMedia device. SpeechRecognition
 * cannot — it always uses the OS/browser default, with no API to redirect it.
 * A green meter on a non-default device proves nothing about what recognition
 * is hearing, which is exactly the trap an operator can fall into on desktop
 * (a USB mixer or interface selected in the meter, while Windows' default is
 * still the laptop's built-in mic). This surfaces that mismatch explicitly
 * instead of implying the two are connected.
 */

import { useEffect, useState } from "react"
import type { Listening } from "./use-listening"
import type { AudioInput } from "./use-audio-meter"

export type DeviceMatch = "same" | "different" | "unknown"

export interface DiagnosticEventView {
  at: number
  label: string
  agoLabel: string
}

export interface RecognitionDiagnosticsView {
  meterLabel: string
  recognitionLabel: string
  match: DeviceMatch
  /** Set only when match === "different" — the exact warning to show. */
  mismatchWarning: string | null
  /** Set for "same" or "unknown" — a shorter reassurance/caveat line. */
  matchNote: string | null
  restartCount: number
  lastInterim: string
  lastFinal: string
  lastResultAgo: string
  startedAgo: string
  events: DiagnosticEventView[]
}

/**
 * Whether the meter's selected device and the OS/browser default recognition
 * uses are provably the same hardware. Pulled out as a pure function — no
 * "same/different" claim here should ever be a guess dressed up as a fact —
 * so it's directly testable: see scripts/check-audio-diagnostics.ts.
 */
export function computeDeviceMatch(
  selected: Pick<AudioInput, "isDefault" | "groupId"> | undefined,
  defaultDevice: Pick<AudioInput, "groupId"> | undefined,
  hasExplicitSelection: boolean
): DeviceMatch {
  // No explicit choice means the meter is already asking for "default" — trivially the same
  // target as recognition, whatever that resolves to.
  if (!hasExplicitSelection) return "same"
  // The operator picked the entry the browser itself flags as the default.
  if (selected?.isDefault) return "same"
  // Devices that are the same physical hardware share a groupId, even when the "default"
  // pseudo-entry has its own deviceId distinct from the real device's own entry.
  if (selected?.groupId && defaultDevice?.groupId) {
    return selected.groupId === defaultDevice.groupId ? "same" : "different"
  }
  // No groupId to compare yet — usually because microphone permission hasn't been granted,
  // so device labels/groupIds are still blank. Never claim "different" without evidence.
  return "unknown"
}

/** The exact copy shown for each match outcome — kept alongside computeDeviceMatch so the two are tested together. */
export function describeDeviceMatch(match: DeviceMatch, meterLabel: string, recognitionLabel: string): { mismatchWarning: string | null; matchNote: string | null } {
  if (match === "different") {
    return { mismatchWarning: `Audio meter is monitoring ${meterLabel}, but speech recognition is listening to ${recognitionLabel}.`, matchNote: null }
  }
  if (match === "same") {
    return { mismatchWarning: null, matchNote: "Meter and recognition are using the same input — the level meter reflects what recognition hears." }
  }
  return {
    mismatchWarning: null,
    matchNote: "Can't confirm whether the meter and recognition are using the same input yet — grant microphone permission, or select an input, to check.",
  }
}

function formatAgo(at: number | null, now: number): string {
  if (at == null) return "never"
  const s = Math.max(0, Math.round((now - at) / 1000))
  if (s < 1) return "just now"
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  const rem = s % 60
  return rem ? `${m}m ${rem}s ago` : `${m}m ago`
}

const EVENT_LABEL: Record<string, string> = {
  start: "Recognition started",
  result: "Result received",
  "end-clean": "Ended (silence) — restarting",
  "end-after-error": "Ended after error — retrying",
  error: "Error reported",
  "start-failed": "Failed to (re)start — retrying",
  "gave-up": "Gave up listening",
}

/** deviceId as stored for the meter: null means "no explicit choice" → the OS default. */
export function useRecognitionDiagnostics(
  listening: Pick<Listening, "diagnostics">,
  meterDevices: AudioInput[],
  selectedMeterDeviceId: string | null
): RecognitionDiagnosticsView {
  // Re-render every second so "Xs ago" stays live while this is on screen.
  const [, tick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => tick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [])
  const now = Date.now()

  const defaultDevice = meterDevices.find((d) => d.isDefault)
  const recognitionLabel = defaultDevice?.label ?? "the system default microphone"
  const selected = selectedMeterDeviceId ? meterDevices.find((d) => d.deviceId === selectedMeterDeviceId) : defaultDevice
  const meterLabel = selected?.label ?? (selectedMeterDeviceId ? "the selected microphone" : recognitionLabel)

  const match = computeDeviceMatch(selected, defaultDevice, !!selectedMeterDeviceId)
  const { mismatchWarning, matchNote } = describeDeviceMatch(match, meterLabel, recognitionLabel)

  const d = listening.diagnostics
  const events: DiagnosticEventView[] = [...d.events].reverse().map((e) => ({
    at: e.at,
    label: `${EVENT_LABEL[e.type] ?? e.type}${e.detail ? ` — ${e.detail}` : ""}`,
    agoLabel: formatAgo(e.at, now),
  }))

  return {
    meterLabel,
    recognitionLabel,
    match,
    mismatchWarning,
    matchNote,
    restartCount: d.restartCount,
    lastInterim: d.lastInterim,
    lastFinal: d.lastFinal,
    lastResultAgo: formatAgo(d.lastResultAt, now),
    startedAgo: formatAgo(d.startedAt, now),
    events,
  }
}
