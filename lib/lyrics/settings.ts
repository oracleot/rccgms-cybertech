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

/**
 * Background mode. Transparent is the default and the invariant: OBS owns the
 * broadcast graphics, so unless an operator deliberately chooses otherwise the
 * display renders text on nothing.
 */
export type BackgroundMode = "transparent" | "solid" | "gradient" | "image"

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
  // Background — transparent unless explicitly changed. The fields for the
  // other modes are only read when backgroundMode selects them.
  backgroundMode: BackgroundMode
  backgroundColor: string
  gradientFrom: string
  gradientTo: string
  gradientAngle: number
  backgroundImageUrl: string
  /** 0–100; only applied to a solid/gradient/image background, never to text. */
  backgroundOpacity: number
  /** Highlight behind just the text (not full screen). */
  highlightColor: string
  /** 0–100; 0 is invisible, default is almost transparent. */
  highlightOpacity: number
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
  // A modest default so a fresh Browser Source isn't huge; the operator can
  // scale up to 150% or down to 1% from the dock.
  scale: 0.5,
  color: "#ffffff",
  secondaryColor: "#cfd0e6",
  shadowStrength: 70,
  maxLines: 3,
  transition: "fade",
  backgroundMode: "transparent",
  backgroundColor: "#000000",
  gradientFrom: "#1a1a2e",
  gradientTo: "#0f0f1a",
  gradientAngle: 180,
  backgroundImageUrl: "",
  backgroundOpacity: 100,
  highlightColor: "#e8e8e8",
  highlightOpacity: 6,
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
    // Down to 0.01 (1%) so the Text size slider can reach its new minimum;
    // anything below is clamped up rather than hitting zero.
    scale: clamp(p.scale, 0.01, 3, LYRICS_DEFAULTS.scale),
    color: parseHex(p.color, LYRICS_DEFAULTS.color),
    secondaryColor: parseHex(p.secondaryColor, LYRICS_DEFAULTS.secondaryColor),
    shadowStrength: clamp(p.shadowStrength, 0, 100, LYRICS_DEFAULTS.shadowStrength),
    maxLines: clamp(p.maxLines, 1, 6, LYRICS_DEFAULTS.maxLines),
    transition: p.transition === "cut" ? "cut" : "fade",
    // Anything unrecognised falls back to transparent — an old cached settings
    // blob from before backgrounds existed stays transparent, never guessed
    // into a solid colour.
    backgroundMode:
      p.backgroundMode === "solid" || p.backgroundMode === "gradient" || p.backgroundMode === "image"
        ? p.backgroundMode
        : "transparent",
    backgroundColor: parseHex(p.backgroundColor, LYRICS_DEFAULTS.backgroundColor),
    gradientFrom: parseHex(p.gradientFrom, LYRICS_DEFAULTS.gradientFrom),
    gradientTo: parseHex(p.gradientTo, LYRICS_DEFAULTS.gradientTo),
    gradientAngle: clamp(p.gradientAngle, 0, 360, LYRICS_DEFAULTS.gradientAngle),
    // Only a same-origin path (Supabase Storage public URL) or https is
    // allowed, so a malformed or javascript: value can't reach the display.
    backgroundImageUrl: safeImageUrl(p.backgroundImageUrl),
    backgroundOpacity: clamp(p.backgroundOpacity, 0, 100, LYRICS_DEFAULTS.backgroundOpacity),
    highlightColor: parseHex(p.highlightColor, LYRICS_DEFAULTS.highlightColor),
    highlightOpacity: clamp(p.highlightOpacity, 0, 100, LYRICS_DEFAULTS.highlightOpacity),
  }
}

function safeImageUrl(raw: unknown): string {
  if (typeof raw !== "string") return ""
  const v = raw.trim()
  if (!v) return ""
  if (v.startsWith("https://") || v.startsWith("/")) return v
  return ""
}

/** The CSS `background` value for the current mode, or "transparent". Shared by the display and the dock preview so they match. */
export function backgroundCss(s: LyricsSettings): string {
  switch (s.backgroundMode) {
    case "solid":
      return s.backgroundColor
    case "gradient":
      return `linear-gradient(${s.gradientAngle}deg, ${s.gradientFrom}, ${s.gradientTo})`
    case "image":
      return s.backgroundImageUrl ? `center / cover no-repeat url("${cssUrlEscape(s.backgroundImageUrl)}")` : "transparent"
    default:
      return "transparent"
  }
}

export function highlightRgba(s: LyricsSettings): string {
  const hex = s.highlightColor.replace("#", "")
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${s.highlightOpacity / 100})`
}

function cssUrlEscape(url: string): string {
  return url.replace(/["\\]/g, "\\$&")
}

/** Preset wins over align/vAlign — picking a preset sets a sensible pair of the two. */
export function applyPositionPreset(s: LyricsSettings, preset: PositionPreset): LyricsSettings {
  if (preset === "bottom-center") return { ...s, positionPreset: preset, align: "center", vAlign: "bottom" }
  if (preset === "top-center") return { ...s, positionPreset: preset, align: "center", vAlign: "top" }
  if (preset === "center") return { ...s, positionPreset: preset, align: "center", vAlign: "center" }
  return { ...s, positionPreset: preset }
}

// The appearance cache is keyed per room, so a display or dock reloading paints
// its own room's look — never another room's stale settings.
function settingsKey(roomId: string): string {
  return `${LYRICS_SETTINGS_KEY}:${roomId}`
}

export function loadSettings(roomId: string): LyricsSettings {
  try {
    const raw = window.localStorage.getItem(settingsKey(roomId))
    if (raw) return normalize(JSON.parse(raw))
  } catch {
    // private mode, blocked storage — fall through to defaults
  }
  return LYRICS_DEFAULTS
}

export function saveSettings(roomId: string, s: LyricsSettings): void {
  try {
    window.localStorage.setItem(settingsKey(roomId), JSON.stringify(s))
  } catch {
    // non-fatal: settings still apply for this session
  }
}
