"use client"

/**
 * Listening from inside the dock, when the browser can do it. OBS's embedded
 * browser can't (no speech service), so this icon only appears where
 * SpeechRecognition exists — typically the dock opened in Chrome or Edge.
 */

import { useEffect, useRef, useState } from "react"
import * as Popover from "@radix-ui/react-popover"
import { Mic, MicOff } from "lucide-react"
import { STATUS_LABEL, useListening } from "@/components/bible/listening/use-listening"
import { loadPreferredMeterDevice, savePreferredMeterDevice, useAudioMeter } from "@/components/bible/listening/use-audio-meter"
import { useRecognitionDiagnostics } from "@/components/bible/listening/use-recognition-diagnostics"
import type { Dock } from "./use-dock"
import { Tip } from "./tip"

const LANG_KEY = "bible-dock-lang"
const VOICE_ACTION_KEY = "bible-dock-voice-action"
type VoiceAction = "suggest" | "auto-send"
const LANGS = [
  ["en-NG", "Nigerian English"],
  ["en-GH", "Ghanaian English"],
  ["en-GB", "British English"],
  ["en-US", "American English"],
  ["en-ZA", "South African"],
  ["en-AU", "Australian"],
  ["en-IN", "Indian English"],
] as const

export function AudioPopover({ dock }: { dock: Dock }) {
  const [open, setOpen] = useState(false)
  const [lang, setLang] = useState("en-NG")
  const listening = useListening(lang)
  const [meterOn, setMeterOn] = useState(false)
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const meter = useAudioMeter(meterOn && open, deviceId)
  const diag = useRecognitionDiagnostics(listening, meter.devices, deviceId)
  const [voiceAction, setVoiceAction] = useState<VoiceAction>("suggest")
  const [lastSent, setLastSent] = useState<string | null>(null)
  const autoSentRef = useRef(new Set<string>())

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LANG_KEY)
      if (saved) setLang(saved)
      const savedAction = window.localStorage.getItem(VOICE_ACTION_KEY)
      if (savedAction === "auto-send") setVoiceAction("auto-send")
    } catch {
      // ignore
    }
    setDeviceId(loadPreferredMeterDevice())
  }, [])

  // Auto-send high confidence references
  useEffect(() => {
    if (voiceAction !== "auto-send") return
    if (dock.locked || dock.busy) return
    for (const r of listening.refs) {
      if (r.confidence !== "high") continue
      if (autoSentRef.current.has(r.reference)) continue
      autoSentRef.current.add(r.reference)
      setLastSent(r.reference)
      void dock.send({ apiPath: r.apiPath, reference: r.reference })
      break
    }
  }, [listening.refs, voiceAction, dock])

  // Reset auto-sent set when listening restarts
  useEffect(() => {
    if (listening.status !== "listening") {
      autoSentRef.current.clear()
      setLastSent(null)
    }
  }, [listening.status])

  // Resolve device labels (and so "System Default" → an actual device name) even when the
  // level meter itself is off — this only enumerates, it never opens a stream.
  useEffect(() => {
    void meter.refreshDevices()
  }, [meter.refreshDevices])

  if (!listening.supported) return null

  const tone =
    listening.status === "listening" ? "on" : ["ready", "stopped"].includes(listening.status) ? "" : "bad"

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Tip label={listening.status === "listening" ? "Listening — voice detection" : "Voice detection and audio input"}>
        <Popover.Trigger asChild>
          <button className={`tool-btn${listening.status === "listening" ? " listening" : ""}`} aria-label="Audio">
            {listening.status === "listening" ? <Mic /> : <MicOff />}
          </button>
        </Popover.Trigger>
      </Tip>
      <Popover.Portal>
        <Popover.Content className="pop" side="top" align="start" sideOffset={8} collisionPadding={8}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span className={`status-pill ${tone}`}>
              {listening.status === "listening" && <span className="dot" />}
              {STATUS_LABEL[listening.status]}
            </span>
            <button
              className={listening.status === "listening" ? "btn-clear" : "btn-primary"}
              style={{ width: "auto", padding: "5px 12px" }}
              onClick={listening.status === "listening" ? listening.stop : listening.start}
            >
              {listening.status === "listening" ? "Stop" : "Start listening"}
            </button>
          </div>
          {listening.detail && <div className={`hint-line ${listening.status === "listening" ? "" : "low"}`}>{listening.detail}</div>}

          {listening.refs.length > 0 ? (
            <div className="chooser">
              <span className="title">
                {voiceAction === "auto-send" ? "Detected" : "Heard"}
                {dock.locked && <span className="note"> — LOCKED</span>}
              </span>
              {listening.refs.map((r) => {
                const wasSent = autoSentRef.current.has(r.reference)
                return (
                  <button
                    key={r.reference}
                    type="button"
                    onClick={() => {
                      void dock.send({ apiPath: r.apiPath, reference: r.reference })
                      setLastSent(r.reference)
                      setOpen(false)
                    }}
                    disabled={dock.locked || dock.busy}
                    title={r.span}
                  >
                    {r.reference}
                    {r.confidence !== "high" && <span className="note"> — check</span>}
                    {wasSent && <span className="note sent"> ✓ sent</span>}
                  </button>
                )
              })}
            </div>
          ) : listening.status === "listening" ? (
            <div className="hint">
              {listening.transcript ? "Hearing speech — no reference detected yet." : "Listening for Bible references…"}
            </div>
          ) : null}
          {lastSent && voiceAction === "auto-send" && (
            <div className="hint" style={{ color: "#4ade80" }}>Sent: {lastSent}</div>
          )}

          <div className="srow">
            <span>Accent</span>
            <select
              className="compact"
              value={lang}
              onChange={(e) => {
                setLang(e.target.value)
                try {
                  window.localStorage.setItem(LANG_KEY, e.target.value)
                } catch {
                  // ignore
                }
              }}
            >
              {LANGS.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="srow">
            <span>Voice action</span>
            <select
              className="compact"
              value={voiceAction}
              onChange={(e) => {
                const v = e.target.value as VoiceAction
                setVoiceAction(v)
                autoSentRef.current.clear()
                try {
                  window.localStorage.setItem(VOICE_ACTION_KEY, v)
                } catch {
                  // ignore
                }
              }}
            >
              <option value="suggest">Suggest only</option>
              <option value="auto-send">Auto-send high confidence</option>
            </select>
          </div>

          <div className="srow">
            <span>Input level</span>
            <input type="checkbox" checked={meterOn} onChange={(e) => setMeterOn(e.target.checked)} />
          </div>
          {meterOn && (
            <>
              <div className="level-bar">
                <div className={`level-fill${meter.level > 0.85 ? " hot" : meter.level > 0.6 ? " warm" : ""}`} style={{ width: `${Math.round(meter.level * 100)}%` }} />
                <div className="level-peak" style={{ left: `${Math.round(meter.peak * 100)}%` }} />
              </div>
              {meter.error && <div className="hint-line low">{meter.error}</div>}
              {meter.devices.length > 0 && (
                <select
                  className="compact"
                  style={{ width: "100%" }}
                  value={deviceId ?? "default"}
                  onChange={(e) => {
                    const id = e.target.value === "default" ? null : e.target.value
                    setDeviceId(id)
                    savePreferredMeterDevice(id)
                  }}
                >
                  {meter.devices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label}
                      {d.isDefault ? " — system default, used for recognition" : ""}
                    </option>
                  ))}
                </select>
              )}
            </>
          )}

          {/* A green meter proves nothing about what recognition hears unless they're the same
              input — say so plainly rather than let a moving bar imply a connection that may
              not exist. */}
          {diag.mismatchWarning ? (
            <div className="diag-warn">{diag.mismatchWarning}</div>
          ) : (
            diag.matchNote && <div className="hint">{diag.matchNote}</div>
          )}

          <details>
            <summary className="hint" style={{ cursor: "pointer" }}>
              Recognition diagnostics
            </summary>
            <div className="diag">
              <div className="diag-row">
                <span className="k">Meter input</span>
                <span className="v">{diag.meterLabel}</span>
              </div>
              <div className="diag-row">
                <span className="k">Recognition input</span>
                <span className="v">System Default ({diag.recognitionLabel})</span>
              </div>
              <div className="diag-row">
                <span className="k">Same device?</span>
                <span className={diag.match === "different" ? "diag-warn" : diag.match === "same" ? "diag-good" : "v"}>
                  {diag.match === "same" ? "Yes" : diag.match === "different" ? "No" : "Can't tell"}
                </span>
              </div>
              <div className="diag-row">
                <span className="k">Status</span>
                <span className="v">{STATUS_LABEL[listening.status]}</span>
              </div>
              <div className="diag-row">
                <span className="k">Started</span>
                <span className="v">{diag.startedAgo}</span>
              </div>
              <div className="diag-row">
                <span className="k">Last result</span>
                <span className="v">{diag.lastResultAgo}</span>
              </div>
              <div className="diag-row">
                <span className="k">Restarts</span>
                <span className="v">{diag.restartCount}</span>
              </div>
              {diag.lastInterim && <div className="diag-quote">Interim: &ldquo;{diag.lastInterim}&rdquo;</div>}
              {diag.lastFinal && <div className="diag-quote">Final: &ldquo;{diag.lastFinal}&rdquo;</div>}
              <div className="diag-events">
                {diag.events.length === 0 ? (
                  <span className="k">No events yet</span>
                ) : (
                  diag.events.map((e, i) => (
                    <div className="row2" key={i}>
                      <span>{e.label}</span>
                      <span className="ago">{e.agoLabel}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </details>

          {listening.transcript && (
            <details>
              <summary className="hint" style={{ cursor: "pointer" }}>
                Full transcript
              </summary>
              <div className="hint" style={{ fontFamily: "monospace", marginTop: 4, maxHeight: 90, overflow: "auto" }}>
                {listening.transcript}
              </div>
            </details>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
