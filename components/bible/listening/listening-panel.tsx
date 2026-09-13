"use client"

/**
 * The Bible Reader's voice-detection card. What matters is prominent —
 * status and the detected references with Send — and the raw transcript,
 * useful for diagnosing mishearings, stays folded away.
 */

import { useEffect, useState } from "react"
import { AudioLines, ChevronDown, ChevronUp, Loader2, Mic, MicOff, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { VoiceReference } from "@/lib/bible/voice-reference"
import { STATUS_LABEL, type Listening, type ListenStatus } from "./use-listening"
import { loadPreferredMeterDevice, savePreferredMeterDevice, useAudioMeter } from "./use-audio-meter"
import { useRecognitionDiagnostics } from "./use-recognition-diagnostics"

interface Props {
  listening: Listening
  onSend: (ref: VoiceReference) => void
  sending: string | null
}

const TONE: Record<ListenStatus, string> = {
  listening: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30",
  ready: "bg-muted text-muted-foreground border-border",
  stopped: "bg-muted text-muted-foreground border-border",
  unsupported: "bg-muted text-muted-foreground border-border",
  unavailable: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  "permission-denied": "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30",
  "no-audio": "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30",
  disconnected: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30",
  error: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30",
}

export function ListeningPanel({ listening, onSend, sending }: Props) {
  const { supported, status, detail, transcript, refs, start, stop, clearTranscript } = listening
  const [showTranscript, setShowTranscript] = useState(false)
  const [showAudio, setShowAudio] = useState(false)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base">Voice detection</CardTitle>
            <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", TONE[status])}>
              {status === "listening" && <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />}
              {STATUS_LABEL[status]}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => setShowAudio((s) => !s)} title="Audio input and level">
              <AudioLines className="h-3.5 w-3.5" />
              Audio
            </Button>
            {supported ? (
              <Button variant={status === "listening" ? "destructive" : "default"} onClick={status === "listening" ? stop : start} className="gap-2">
                {status === "listening" ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {status === "listening" ? "Stop Listening" : "Start Listening"}
              </Button>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                Requires Chrome or Edge
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {detail && <p className={cn("text-sm", status === "listening" ? "text-muted-foreground" : "text-red-600 dark:text-red-400")}>{detail}</p>}

        {!supported && (
          <p className="text-sm text-muted-foreground">
            Open this page in Google Chrome or Microsoft Edge for microphone detection. Typing a reference below works everywhere.
          </p>
        )}
        {supported && status === "ready" && (
          <p className="text-sm text-muted-foreground">
            Press Start Listening. As the pastor speaks, references like “John 3:16”, “Psalm 23” or “First Corinthians 13 verse 4”
            appear here with a Send button. Nothing is sent until you press it.
          </p>
        )}

        {showAudio && <AudioSection listening={listening} />}

        {refs.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Detected references</p>
            <div className="flex flex-wrap gap-2">
              {refs.map((ref) => (
                <div key={ref.reference} className="flex items-center gap-1">
                  <Badge
                    variant={ref.confidence === "high" ? "secondary" : "outline"}
                    className={cn("font-mono text-sm", ref.confidence !== "high" && "border-amber-500/50 text-amber-700 dark:text-amber-400")}
                    title={ref.confidence === "high" ? ref.span : `Heard “${ref.span}” — check before sending`}
                  >
                    {ref.reference}
                  </Badge>
                  <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => onSend(ref)} disabled={sending !== null}>
                    {sending === ref.reference ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                    Send
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          status === "listening" && <p className="text-sm text-muted-foreground">Listening — references will appear here as they are spoken.</p>
        )}

        {transcript && (
          <div className="space-y-1">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowTranscript((s) => !s)}
            >
              {showTranscript ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {showTranscript ? "Hide transcript" : "Show transcript"}
            </button>
            {showTranscript && (
              <div className="space-y-1">
                <div className="rounded-md bg-muted/50 border p-3 text-sm text-muted-foreground leading-relaxed font-mono max-h-32 overflow-y-auto">
                  {transcript}
                </div>
                <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={clearTranscript}>
                  Clear transcript
                </button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function AudioSection({ listening }: { listening: Listening }) {
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [showDiagnostics, setShowDiagnostics] = useState(false)
  useEffect(() => {
    setDeviceId(loadPreferredMeterDevice())
  }, [])
  const meter = useAudioMeter(true, deviceId)
  const diag = useRecognitionDiagnostics(listening, meter.devices, deviceId)
  const pick = (id: string | null) => {
    setDeviceId(id)
    savePreferredMeterDevice(id)
  }
  const current = meter.devices.find((d) => d.deviceId === (deviceId ?? "default")) ?? meter.devices.find((d) => d.isDefault)

  return (
    <div className="rounded-md border bg-muted/30 p-3 space-y-3">
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium">Input level{current ? ` — ${current.label}` : ""}</span>
          <span className="text-muted-foreground">{meter.active ? `${Math.round(meter.level * 100)}%` : "—"}</span>
        </div>
        <div className="h-2 w-full rounded bg-muted overflow-hidden relative">
          <div
            className={cn("h-full rounded transition-[width] duration-75", meter.level > 0.85 ? "bg-red-500" : meter.level > 0.6 ? "bg-amber-500" : "bg-green-500")}
            style={{ width: `${Math.round(meter.level * 100)}%` }}
          />
          <div className="absolute top-0 h-full w-0.5 bg-foreground/60" style={{ left: `${Math.round(meter.peak * 100)}%` }} />
        </div>
        {meter.error && <p className="text-xs text-red-600 dark:text-red-400">{meter.error}</p>}
      </div>

      {meter.devices.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium">Audio inputs</p>
          <div className="space-y-1">
            {meter.devices.map((d) => (
              <label key={d.deviceId} className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="radio"
                  name="meter-device"
                  checked={(deviceId ?? "default") === d.deviceId || (!deviceId && d.isDefault)}
                  onChange={() => pick(d.deviceId === "default" ? null : d.deviceId)}
                />
                <span className="truncate">{d.label}</span>
                {d.isDefault && <Badge variant="secondary" className="text-[10px]">system default — used for recognition</Badge>}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* A green meter proves nothing about what recognition hears unless the two inputs are
          the same device — a mismatch here is exactly what can make recognition look "broken"
          while the meter says everything is fine. */}
      {diag.mismatchWarning ? (
        <p className="text-xs font-semibold text-red-600 dark:text-red-400 leading-relaxed">{diag.mismatchWarning}</p>
      ) : (
        <p className="text-xs text-muted-foreground leading-relaxed">{diag.matchNote}</p>
      )}

      <div className="space-y-1.5 pt-1 border-t">
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setShowDiagnostics((s) => !s)}
        >
          {showDiagnostics ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          Recognition diagnostics
        </button>
        {showDiagnostics && (
          <div className="text-xs space-y-1 font-mono">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground font-sans">Meter input</span>
              <span className="truncate max-w-[60%]">{diag.meterLabel}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground font-sans">Recognition input</span>
              <span className="truncate max-w-[60%]">System Default ({diag.recognitionLabel})</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground font-sans">Same device?</span>
              <span
                className={
                  diag.match === "different"
                    ? "text-red-600 dark:text-red-400 font-semibold"
                    : diag.match === "same"
                      ? "text-green-600 dark:text-green-400 font-semibold"
                      : ""
                }
              >
                {diag.match === "same" ? "Yes" : diag.match === "different" ? "No" : "Can't tell"}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground font-sans">Status</span>
              <span>{STATUS_LABEL[listening.status]}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground font-sans">Started</span>
              <span>{diag.startedAgo}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground font-sans">Last result</span>
              <span>{diag.lastResultAgo}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground font-sans">Restarts</span>
              <span>{diag.restartCount}</span>
            </div>
            {diag.lastInterim && (
              <p className="italic text-muted-foreground font-sans">Interim: &ldquo;{diag.lastInterim}&rdquo;</p>
            )}
            {diag.lastFinal && <p className="italic text-muted-foreground font-sans">Final: &ldquo;{diag.lastFinal}&rdquo;</p>}
            <div className="max-h-28 overflow-y-auto space-y-0.5 pt-1 border-t font-sans">
              {diag.events.length === 0 ? (
                <p className="text-muted-foreground">No events yet</p>
              ) : (
                diag.events.map((e, i) => (
                  <div key={i} className="flex justify-between gap-3 text-muted-foreground">
                    <span>{e.label}</span>
                    <span className="shrink-0 opacity-70">{e.agoLabel}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
