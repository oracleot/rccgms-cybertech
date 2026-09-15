"use client"

/**
 * Background controls for the OBS display, in the dock's Advanced settings.
 *
 * Nothing here touches the live output until the operator presses Apply. The
 * chosen background is edited in a local draft and shown in a preview pane
 * using the SAME backgroundCss the display uses, so what's previewed is what
 * goes live. This is the deliberate alternative to a staged-settings protocol:
 * a half-set background can never leak onto the stream because it isn't sent
 * until Apply.
 *
 * Presets and uploaded images live in Supabase (shared across the operator's
 * browser and OBS's own), never in localStorage.
 */

import { useEffect, useMemo, useRef, useState } from "react"
import { backgroundCss, type BackgroundMode, type LyricsSettings } from "@/lib/lyrics/settings"
import {
  deletePreset,
  loadPresets,
  savePreset,
  subscribeToPresets,
  uploadBackgroundImage,
  type BackgroundPreset,
} from "@/lib/lyrics/backgrounds"
import type { LyricsDock } from "./use-dock"

type Draft = Pick<
  LyricsSettings,
  | "backgroundMode"
  | "backgroundColor"
  | "gradientFrom"
  | "gradientTo"
  | "gradientAngle"
  | "backgroundImageUrl"
  | "backgroundOpacity"
>

function draftOf(s: LyricsSettings): Draft {
  return {
    backgroundMode: s.backgroundMode,
    backgroundColor: s.backgroundColor,
    gradientFrom: s.gradientFrom,
    gradientTo: s.gradientTo,
    gradientAngle: s.gradientAngle,
    backgroundImageUrl: s.backgroundImageUrl,
    backgroundOpacity: s.backgroundOpacity,
  }
}

function sameDraft(a: Draft, b: Draft): boolean {
  return (
    a.backgroundMode === b.backgroundMode &&
    a.backgroundColor === b.backgroundColor &&
    a.gradientFrom === b.gradientFrom &&
    a.gradientTo === b.gradientTo &&
    a.gradientAngle === b.gradientAngle &&
    a.backgroundImageUrl === b.backgroundImageUrl &&
    a.backgroundOpacity === b.backgroundOpacity
  )
}

export function BackgroundSettings({ dock }: { dock: LyricsDock }) {
  const { settings, pushSettings } = dock
  const [draft, setDraft] = useState<Draft>(() => draftOf(settings))
  const [presets, setPresets] = useState<BackgroundPreset[]>([])
  const [presetName, setPresetName] = useState("")
  const [busy, setBusy] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let alive = true
    const refresh = () => loadPresets().then((p) => alive && setPresets(p))
    void refresh()
    const unsub = subscribeToPresets(() => void refresh())
    return () => {
      alive = false
      unsub()
    }
  }, [])

  const previewSettings = useMemo<LyricsSettings>(() => ({ ...settings, ...draft }), [settings, draft])
  const applied = sameDraft(draft, draftOf(settings))
  const update = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))

  const applyPreset = (p: BackgroundPreset) => {
    update({
      backgroundMode: p.mode,
      backgroundColor: p.color ?? draft.backgroundColor,
      gradientFrom: p.gradientFrom ?? draft.gradientFrom,
      gradientTo: p.gradientTo ?? draft.gradientTo,
      gradientAngle: p.gradientAngle ?? draft.gradientAngle,
      backgroundImageUrl: p.imageUrl ?? "",
    })
  }

  const onUpload = async (file: File) => {
    setBusy("Uploading…")
    try {
      const url = await uploadBackgroundImage(file)
      update({ backgroundMode: "image", backgroundImageUrl: url })
    } catch {
      setBusy("Upload failed — check your connection")
      setTimeout(() => setBusy(null), 3000)
      return
    }
    setBusy(null)
  }

  const onSavePreset = async () => {
    if (draft.backgroundMode === "transparent" || !presetName.trim()) return
    setBusy("Saving preset…")
    try {
      await savePreset({
        name: presetName.trim(),
        mode: draft.backgroundMode,
        color: draft.backgroundColor,
        gradientFrom: draft.gradientFrom,
        gradientTo: draft.gradientTo,
        gradientAngle: draft.gradientAngle,
        imageUrl: draft.backgroundImageUrl || undefined,
      })
      setPresetName("")
    } catch {
      setBusy("Couldn't save preset")
      setTimeout(() => setBusy(null), 3000)
      return
    }
    setBusy(null)
  }

  return (
    <>
      <span className="section-label">Advanced — Background</span>
      <div className="hint">
        Transparent by default — OBS owns the broadcast graphics. Preview a background here and press Apply to send it
        to the live display. Nothing changes on screen until you apply.
      </div>

      <div className="srow">
        <span>Mode</span>
        <select
          className="compact"
          value={draft.backgroundMode}
          onChange={(e) => update({ backgroundMode: e.target.value as BackgroundMode })}
        >
          <option value="transparent">Transparent</option>
          <option value="solid">Solid colour</option>
          <option value="gradient">Gradient</option>
          <option value="image">Image</option>
        </select>
      </div>

      {draft.backgroundMode === "solid" && (
        <div className="srow">
          <span>Colour</span>
          <input type="color" value={draft.backgroundColor} onChange={(e) => update({ backgroundColor: e.target.value })} />
        </div>
      )}

      {draft.backgroundMode === "gradient" && (
        <>
          <div className="srow">
            <span>From</span>
            <input type="color" value={draft.gradientFrom} onChange={(e) => update({ gradientFrom: e.target.value })} />
          </div>
          <div className="srow">
            <span>To</span>
            <input type="color" value={draft.gradientTo} onChange={(e) => update({ gradientTo: e.target.value })} />
          </div>
          <div className="srow">
            <span>Angle</span>
            <div className="ctl">
              <input
                type="range"
                min={0}
                max={360}
                step={15}
                value={draft.gradientAngle}
                onChange={(e) => update({ gradientAngle: Number(e.target.value) })}
              />
              <span className="val">{draft.gradientAngle}°</span>
            </div>
          </div>
        </>
      )}

      {draft.backgroundMode === "image" && (
        <>
          <div className="srow">
            <span>Image</span>
            <button className="btn-ghost" onClick={() => fileRef.current?.click()}>
              Upload…
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void onUpload(f)
              e.target.value = ""
            }}
          />
          {!draft.backgroundImageUrl && <div className="hint">No image yet — upload a JPG, PNG or WebP (max 10MB).</div>}
        </>
      )}

      {draft.backgroundMode !== "transparent" && (
        <div className="srow">
          <span>Opacity</span>
          <div className="ctl">
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={draft.backgroundOpacity}
              onChange={(e) => update({ backgroundOpacity: Number(e.target.value) })}
            />
            <span className="val">{draft.backgroundOpacity}%</span>
          </div>
        </div>
      )}

      {/* Preview pane: same backgroundCss as the live display, with sample text
          so margins/contrast are visible before applying. */}
      <div className="bg-preview" style={{ background: "#0a0a0f" }}>
        <div
          className="bg-preview-fill"
          style={{
            background: backgroundCss(previewSettings),
            opacity: draft.backgroundMode === "transparent" ? 0 : draft.backgroundOpacity / 100,
          }}
        />
        <span className="bg-preview-text" style={{ color: settings.color }}>
          Sample lyric line
        </span>
        {draft.backgroundMode === "transparent" && <span className="bg-preview-tag">Transparent</span>}
      </div>

      {busy && <div className="hint">{busy}</div>}

      <button className="btn-primary wide" disabled={applied} onClick={() => pushSettings({ ...settings, ...draft })}>
        {applied ? "Applied" : "Apply background to live"}
      </button>
      {!applied && (
        <button className="btn-ghost wide" onClick={() => setDraft(draftOf(settings))}>
          Revert to what&apos;s live
        </button>
      )}

      {draft.backgroundMode !== "transparent" && (
        <div className="srow" style={{ marginTop: 6 }}>
          <input
            className="preset-name"
            placeholder="Preset name"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
          />
          <button className="btn-ghost" disabled={!presetName.trim()} onClick={() => void onSavePreset()}>
            Save preset
          </button>
        </div>
      )}

      {presets.length > 0 && (
        <>
          <div className="hint">Presets — tap to preview, then Apply.</div>
          <div className="preset-grid">
            {presets.map((p) => (
              <div key={p.id} className="preset-chip">
                <button
                  className="preset-swatch"
                  style={{ background: swatchCss(p) }}
                  onClick={() => applyPreset(p)}
                  title={p.name}
                  aria-label={`Preview ${p.name}`}
                />
                <span className="preset-label">{p.name}</span>
                <button className="preset-del" onClick={() => void deletePreset(p.id)} aria-label={`Delete ${p.name}`}>
                  ×
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}

function swatchCss(p: BackgroundPreset): string {
  if (p.mode === "solid") return p.color ?? "#000"
  if (p.mode === "gradient") return `linear-gradient(${p.gradientAngle ?? 180}deg, ${p.gradientFrom ?? "#333"}, ${p.gradientTo ?? "#111"})`
  if (p.mode === "image" && p.imageUrl) return `center / cover no-repeat url("${p.imageUrl.replace(/["\\]/g, "\\$&")}")`
  return "#222"
}
