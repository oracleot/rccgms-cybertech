/**
 * Appearance settings for the OBS Bible scene (/bible/obs/scene).
 *
 * The dock is the source of truth: the operator edits settings there and they
 * are broadcast over the same Realtime channel as passages. Both surfaces cache
 * the last known settings in localStorage so an OBS browser source that reloads
 * (scene switch, restart) comes back looking the same without waiting for the dock.
 */

export interface SceneSettings {
  bgColor: string
  bgOpacity: number
  pos: "top" | "center" | "bottom"
  scale: number
  refPos: "top" | "bottom" | "hide"
  serif: boolean
  color: string
  accent: string
  shadow: boolean
  showTranslation: boolean
}

export const SCENE_DEFAULTS: SceneSettings = {
  bgColor: "#000000",
  bgOpacity: 0,
  pos: "center",
  scale: 1,
  refPos: "top",
  serif: true,
  color: "#ffffff",
  accent: "#e8ddff",
  shadow: true,
  showTranslation: true,
}

export const SCENE_SETTINGS_KEY = "bible-obs-scene-settings"

/** "transparent" | "c4a6ff" | "#c4a6ff" | "000000cc" → colour + opacity */
function parseBg(raw: string): { bgColor: string; bgOpacity: number } | null {
  const v = raw.trim().toLowerCase()
  if (!v) return null
  if (v === "transparent") return { bgColor: "#000000", bgOpacity: 0 }
  const h = v.replace(/^#/, "")
  if (/^[0-9a-f]{8}$/.test(h)) {
    return { bgColor: `#${h.slice(0, 6)}`, bgOpacity: parseInt(h.slice(6, 8), 16) / 255 }
  }
  if (/^[0-9a-f]{6}$/.test(h)) return { bgColor: `#${h}`, bgOpacity: 1 }
  if (/^[0-9a-f]{3}$/.test(h)) {
    return { bgColor: `#${h.split("").map((c) => c + c).join("")}`, bgOpacity: 1 }
  }
  return null
}

function parseHex(raw: string | null, fallback: string): string {
  if (!raw) return fallback
  const h = raw.trim().replace(/^#/, "")
  if (/^[0-9a-f]{6}$/i.test(h)) return `#${h}`
  if (/^[0-9a-f]{3}$/i.test(h)) return `#${h.split("").map((c) => c + c).join("")}`
  return fallback
}

/** CSS background value — "transparent" at zero opacity so OBS composites cleanly. */
export function bgToCss(s: Pick<SceneSettings, "bgColor" | "bgOpacity">): string {
  if (s.bgOpacity <= 0) return "transparent"
  const h = s.bgColor.replace(/^#/, "")
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  if ([r, g, b].some(Number.isNaN)) return "transparent"
  return `rgba(${r}, ${g}, ${b}, ${Math.min(s.bgOpacity, 1)})`
}

export function normalize(raw: unknown): SceneSettings {
  const p = (raw ?? {}) as Partial<SceneSettings>
  const scale = Number(p.scale)
  const opacity = Number(p.bgOpacity)
  return {
    bgColor: parseHex(p.bgColor ?? null, SCENE_DEFAULTS.bgColor),
    bgOpacity: Number.isFinite(opacity) ? Math.min(Math.max(opacity, 0), 1) : SCENE_DEFAULTS.bgOpacity,
    pos: p.pos === "top" || p.pos === "bottom" ? p.pos : SCENE_DEFAULTS.pos,
    scale: Number.isFinite(scale) && scale > 0 ? Math.min(scale, 3) : SCENE_DEFAULTS.scale,
    refPos: p.refPos === "bottom" || p.refPos === "hide" ? p.refPos : SCENE_DEFAULTS.refPos,
    serif: p.serif !== false,
    color: parseHex(p.color ?? null, SCENE_DEFAULTS.color),
    accent: parseHex(p.accent ?? null, SCENE_DEFAULTS.accent),
    shadow: p.shadow !== false,
    showTranslation: p.showTranslation !== false,
  }
}

/** URL parameters still work, and win over the cached settings on first load. */
export function settingsFromQuery(search: string): Partial<SceneSettings> {
  const p = new URLSearchParams(search)
  const out: Partial<SceneSettings> = {}
  const bgRaw = p.get("bg")
  if (bgRaw) {
    const bg = parseBg(bgRaw)
    if (bg) Object.assign(out, bg)
  }
  const pos = p.get("pos")
  if (pos === "top" || pos === "bottom" || pos === "center") out.pos = pos
  const size = Number(p.get("size"))
  if (Number.isFinite(size) && size > 0) out.scale = Math.min(size, 3)
  const ref = p.get("ref")
  if (ref === "top" || ref === "bottom" || ref === "hide") out.refPos = ref
  const font = p.get("font")
  if (font) out.serif = font !== "sans"
  if (p.get("color")) out.color = parseHex(p.get("color"), SCENE_DEFAULTS.color)
  if (p.get("accent")) out.accent = parseHex(p.get("accent"), SCENE_DEFAULTS.accent)
  if (p.get("shadow")) out.shadow = p.get("shadow") !== "0"
  if (p.get("translation")) out.showTranslation = p.get("translation") !== "0"
  return out
}

export function loadSettings(): SceneSettings {
  try {
    const raw = window.localStorage.getItem(SCENE_SETTINGS_KEY)
    if (raw) return normalize(JSON.parse(raw))
  } catch {
    // private mode, blocked storage — fall through to defaults
  }
  return SCENE_DEFAULTS
}

export function saveSettings(s: SceneSettings): void {
  try {
    window.localStorage.setItem(SCENE_SETTINGS_KEY, JSON.stringify(s))
  } catch {
    // non-fatal: settings still apply for this session
  }
}
