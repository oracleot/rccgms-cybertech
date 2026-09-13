"use client"

/**
 * A live input level, so the operator can see Fusion is actually receiving
 * audio. Opens the chosen device with getUserMedia and reads an AnalyserNode.
 *
 * This meter can be pointed at any input. Speech recognition cannot: it
 * always uses the system default. So the default device is marked, and a
 * meter on any other device is a "test" of that device, not of recognition.
 */

import { useCallback, useEffect, useRef, useState } from "react"

export interface AudioInput {
  deviceId: string
  label: string
  isDefault: boolean
  /**
   * Devices that are the same physical hardware share a groupId (spec-defined).
   * This is the only way to tell whether a specifically-picked device happens
   * to BE the OS default: the "default" pseudo-entry often has its own
   * deviceId, distinct from the real device's own entry, even when they are
   * the same microphone.
   */
  groupId: string
}

const METER_KEY = "bible-audio-meter-device"

export function loadPreferredMeterDevice(): string | null {
  try {
    return window.localStorage.getItem(METER_KEY)
  } catch {
    return null
  }
}

export function savePreferredMeterDevice(id: string | null) {
  try {
    if (id) window.localStorage.setItem(METER_KEY, id)
    else window.localStorage.removeItem(METER_KEY)
  } catch {
    // non-fatal
  }
}

export function useAudioMeter(enabled: boolean, deviceId: string | null) {
  const [level, setLevel] = useState(0)
  const [peak, setPeak] = useState(0)
  const [devices, setDevices] = useState<AudioInput[]>([])
  const [error, setError] = useState<string | null>(null)
  const [active, setActive] = useState(false)
  const streamRef = useRef<MediaStream | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const rafRef = useRef<number | null>(null)

  const refreshDevices = useCallback(async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices()
      const inputs = all.filter((d) => d.kind === "audioinput")
      // Chrome lists a virtual "default" entry that mirrors the OS default; keep it first and mark it.
      const list: AudioInput[] = inputs.map((d, i) => ({
        deviceId: d.deviceId,
        label: d.label || `Microphone ${i + 1}`,
        isDefault: d.deviceId === "default" || (i === 0 && !inputs.some((x) => x.deviceId === "default")),
        groupId: d.groupId,
      }))
      setDevices(list)
    } catch {
      setDevices([])
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    const md = typeof navigator !== "undefined" ? navigator.mediaDevices : undefined
    if (!md?.getUserMedia) {
      setError("This browser can't open audio inputs.")
      return
    }

    ;(async () => {
      setError(null)
      try {
        const stream = await md.getUserMedia({
          audio: deviceId && deviceId !== "default" ? { deviceId: { exact: deviceId } } : true,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (!Ctx) throw new Error("no AudioContext")
        const ctx = new Ctx()
        ctxRef.current = ctx
        const src = ctx.createMediaStreamSource(stream)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 1024
        src.connect(analyser)
        const buf = new Float32Array(analyser.fftSize)
        let smooth = 0
        let pk = 0
        let last = 0
        const tick = (now: number) => {
          analyser.getFloatTimeDomainData(buf)
          let sum = 0
          for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i]
          const rms = Math.sqrt(sum / buf.length)
          // Perceptual-ish scale: -60 dBFS → 0, 0 dBFS → 1
          const db = 20 * Math.log10(rms || 1e-6)
          const v = Math.min(1, Math.max(0, (db + 60) / 60))
          smooth = v > smooth ? v : smooth * 0.85 + v * 0.15
          pk = Math.max(pk * 0.995, v)
          if (now - last > 80) {
            last = now
            setLevel(smooth)
            setPeak(pk)
          }
          rafRef.current = requestAnimationFrame(tick)
        }
        rafRef.current = requestAnimationFrame(tick)
        setActive(true)
        // Labels are only available once permission has been granted
        void refreshDevices()
        stream.getAudioTracks()[0]?.addEventListener("ended", () => {
          setError("The audio input stopped. It may have been disconnected.")
          setActive(false)
        })
      } catch (e) {
        const name = e instanceof Error ? e.name : ""
        setError(
          name === "NotAllowedError"
            ? "Microphone permission denied."
            : name === "NotFoundError"
              ? "No audio input found."
              : name === "OverconstrainedError" || name === "NotReadableError"
                ? "That input isn't available any more."
                : "Couldn't open the audio input."
        )
        setActive(false)
      }
    })()

    return () => {
      cancelled = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
      void ctxRef.current?.close()
      ctxRef.current = null
      setActive(false)
      setLevel(0)
      setPeak(0)
    }
  }, [enabled, deviceId, refreshDevices])

  useEffect(() => {
    const md = typeof navigator !== "undefined" ? navigator.mediaDevices : undefined
    if (!md?.addEventListener) return
    const onChange = () => void refreshDevices()
    md.addEventListener("devicechange", onChange)
    return () => md.removeEventListener("devicechange", onChange)
  }, [refreshDevices])

  return { level, peak, devices, error, active, refreshDevices }
}
