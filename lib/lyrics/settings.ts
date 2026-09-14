/**
 * Appearance settings for the OBS Lyrics display (/lyrics/obs).
 *
 * The dock is the source of truth: the operator edits settings there and
 * they are broadcast over the lyrics-obs channel. Both surfaces cache the
 * last known settings in localStorage so an OBS browser source that reloads
 * (scene switch, restart) comes back looking the same without waiting for
 * the dock. Default is a professional worship-caption look: bold white text,
 * bottom-centred, strong shadow, fully transparent background — no logo, no
 * watermark; OBS handles branding separately.
 */

export type PositionPreset = "bottom-center" | "center" | "top-center" | "custom"
export type TransitionStyle = "cut" | "fade"
export type Align = "left" | "center" | "right"
export type VAlign = "top" | "center" | "bottom"

export interface LyricsSettings {
  positionPreset: PositionPreset
  align: Align
  /** Only used when positionPreset is "custom". */
  vAlign: VAlign
  safeTop: number
  safeBottom: number
  safeLeft: number
  safeRight: number
  font: "sans" | "serif"
  scale: number
  color: string
  secondaryColor: string
  shadowStrength: number
  maxLines: number
  transition: TransitionStyle
}

export const LYRICS_DEFAULTS: LyricsSettings = {
  positionPreset: "bottom-center",
  align: "center",
  vAlign: "bottom",
  safeTop: 8,
  safeBottom: 10,
  safeLeft: 6,
  safeRight: 6,
  font: "sans",
  scale: 1,
  color: "#ffffff",
  secondaryColor: "#cfd0e6",
  shadowStrength: 70,
  maxLines: 3,
  transition: "fade",
}

export const LYRICS_SETTINGS_KEY = "lyrics-obs-scene-settings"

function parseHex(raw: unknown, fallback: string): string {
  if (typeof raw !== "string") return fallback
  const h = raw.trim().replace(/^#/, "")
  if (/^[0-9a-f]{6}$/i.test(h)) return `#${h}`
  if (/^[0-9a-f]{3}$/i.test(h)) return `#${h.split("").map((c) => c + c).join("")}`
  return fallback
}

function clamp(n: unknown, min: number, max: number, fallback: number): number {
  const v = Number(n)
  return Number.isFinite(v) ? Math.min(Math.max(v, min), max) : fallback
}

export function normalize(raw: unknown): LyricsSettings {
  const p = (raw ?? {}) as Partial<LyricsSettings>
  return {
    positionPreset:
      p.positionPreset === "center" || p.positionPreset === "top-center" || p.positionPreset === "custom"
        ? p.positionPreset
        : "bottom-center",
    align: p.align === "left" || p.align === "right" ? p.align : "center",
    vAlign: p.vAlign === "top" || p.vAlign === "center" ? p.vAlign : "bottom",
    safeTop: clamp(p.safeTop, 0, 40, LYRICS_DEFAULTS.safeTop),
    safeBottom: clamp(p.safeBottom, 0, 40, LYRICS_DEFAULTS.safeBottom),
    safeLeft: clamp(p.safeLeft, 0, 40, LYRICS_DEFAULTS.safeLeft),
    safeRight: clamp(p.safeRight, 0, 40, LYRICS_DEFAULTS.safeRight),
    font: p.font === "serif" ? "serif" : "sans",
    scale: clamp(p.scale, 0.5, 3, LYRICS_DEFAULTS.scale),
    color: parseHex(p.color, LYRICS_DEFAULTS.color),
    secondaryColor: parseHex(p.secondaryColor, LYRICS_DEFAULTS.secondaryColor),
    shadowStrength: clamp(p.shadowStrength, 0, 100, LYRICS_DEFAULTS.shadowStrength),
    maxLines: clamp(p.maxLines, 1, 6, LYRICS_DEFAULTS.maxLines),
    transition: p.transition === "cut" ? "cut" : "fade",
  }
}

/** Preset wins over align/vAlign — picking a preset sets a sensible pair of the two. */
export function applyPositionPreset(s: LyricsSettings, preset: PositionPreset): LyricsSettings {
  if (preset === "bottom-center") return { ...s, positionPreset: preset, align: "center", vAlign: "bottom" }
  if (preset === "top-center") return { ...s, positionPreset: preset, align: "center", vAlign: "top" }
  if (preset === "center") return { ...s, positionPreset: preset, align: "center", vAlign: "center" }
  return { ...s, positionPreset: preset }
}

export function loadSettings(): LyricsSettings {
  try {
    const raw = window.localStorage.getItem(LYRICS_SETTINGS_KEY)
    if (raw) return normalize(JSON.parse(raw))
  } catch {
    // private mode, blocked storage — fall through to defaults
  }
  return LYRICS_DEFAULTS
}

export function saveSettings(s: LyricsSettings): void {
  try {
    window.localStorage.setItem(LYRICS_SETTINGS_KEY, JSON.stringify(s))
  } catch {
    // non-fatal: settings still apply for this session
  }
}
