"use client"

import { LYRICS_DEFAULTS, applyPositionPreset, type PositionPreset, type Align, type VAlign, type TransitionStyle } from "@/lib/lyrics/settings"
import { BackgroundSettings } from "./background-settings"
import type { LyricsDock } from "./use-dock"

export function LyricsSettingsPanel({ dock, roomId, controllerId }: { dock: LyricsDock; roomId: string; controllerId: string | null }) {
  const { settings, updateSetting: update, pushSettings, uiMode, setUiMode, previewFirst, setPreviewFirst } = dock
  const advanced = uiMode === "advanced"

  return (
    <div className="pane">
      <span className="section-label">Settings</span>
      <div className="settings">
        <span className="section-label">Interface</span>
        <div className="srow">
          <span>Mode</span>
          <div className="mode-toggle">
            <button className={uiMode === "simple" ? "active" : ""} onClick={() => setUiMode("simple")}>
              Simple
            </button>
            <button className={uiMode === "advanced" ? "active" : ""} onClick={() => setUiMode("advanced")}>
              Advanced
            </button>
          </div>
        </div>
        <div className="hint">
          Simple keeps the dock to what a live service needs: set/item picking, Prev/Next, Clear, Manual/Auto and
          Lock. Advanced adds safe margins, typography, transitions, preview settings and set creation below.
          Nothing is disabled by switching — it only changes what&apos;s shown.
        </div>

        <div className="divider" />
        <span className="section-label">Basic</span>
        <div className="srow">
          <span>Position</span>
          <select
            className="compact"
            value={settings.positionPreset}
            onChange={(e) => pushSettings(applyPositionPreset(settings, e.target.value as PositionPreset))}
          >
            <option value="bottom-center">Bottom centre</option>
            <option value="center">Centre</option>
            <option value="top-center">Top centre</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <div className="srow">
          <span>Preview before live</span>
          <input type="checkbox" checked={previewFirst} onChange={(e) => setPreviewFirst(e.target.checked)} />
        </div>
        <div className="hint">
          Sent items wait in a preview card until you press Go live. Off by default so the normal workflow stays one
          step.
        </div>

        {advanced && (
          <>
            <div className="divider" />
            <span className="section-label">Advanced — Safe area</span>
            <div className="hint">Keeps text clear of logos/icons OBS is already compositing. Percent of the source, each edge.</div>
            <div className="margin-grid">
              <div className="margin-cell">
                <span>Top</span>
                <input type="number" min={0} max={40} value={settings.safeTop} onChange={(e) => update("safeTop", Number(e.target.value))} />
              </div>
              <div className="margin-cell">
                <span>Bottom</span>
                <input type="number" min={0} max={40} value={settings.safeBottom} onChange={(e) => update("safeBottom", Number(e.target.value))} />
              </div>
              <div className="margin-cell">
                <span>Left</span>
                <input type="number" min={0} max={40} value={settings.safeLeft} onChange={(e) => update("safeLeft", Number(e.target.value))} />
              </div>
              <div className="margin-cell">
                <span>Right</span>
                <input type="number" min={0} max={40} value={settings.safeRight} onChange={(e) => update("safeRight", Number(e.target.value))} />
              </div>
            </div>

            {settings.positionPreset === "custom" && (
              <>
                <div className="srow">
                  <span>Horizontal align</span>
                  <select className="compact" value={settings.align} onChange={(e) => update("align", e.target.value as Align)}>
                    <option value="left">Left</option>
                    <option value="center">Centre</option>
                    <option value="right">Right</option>
                  </select>
                </div>
                <div className="srow">
                  <span>Vertical align</span>
                  <select className="compact" value={settings.vAlign} onChange={(e) => update("vAlign", e.target.value as VAlign)}>
                    <option value="top">Top</option>
                    <option value="center">Centre</option>
                    <option value="bottom">Bottom</option>
                  </select>
                </div>
              </>
            )}

            <div className="divider" />
            <span className="section-label">Advanced — Typography</span>
            <div className="srow">
              <span>Text size</span>
              <div className="ctl">
                <input
                  type="range"
                  min={1}
                  max={150}
                  step={1}
                  value={Math.round(settings.scale * 100)}
                  onChange={(e) => update("scale", Number(e.target.value) / 100)}
                />
                <span className="val">{Math.round(settings.scale * 100)}%</span>
              </div>
            </div>
            <div className="hint">Text auto-fits the safe area — measured, not guessed from character count. This sets how large it may go.</div>
            <div className="srow">
              <span>Max lines</span>
              <input type="number" min={1} max={6} value={settings.maxLines} onChange={(e) => update("maxLines", Number(e.target.value))} />
            </div>
            <div className="srow">
              <span>Font</span>
              <select className="compact" value={settings.font} onChange={(e) => update("font", e.target.value as "sans" | "serif")}>
                <option value="sans">Sans</option>
                <option value="serif">Serif</option>
              </select>
            </div>
            <div className="srow">
              <span>Text colour</span>
              <input type="color" value={settings.color} onChange={(e) => update("color", e.target.value)} />
            </div>
            <div className="srow">
              <span>Secondary colour</span>
              <input type="color" value={settings.secondaryColor} onChange={(e) => update("secondaryColor", e.target.value)} />
            </div>
            <div className="hint">Secondary is the line under the main text — a translation, response or sub-point.</div>
            <div className="srow">
              <span>Outline / shadow</span>
              <div className="ctl">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={settings.shadowStrength}
                  onChange={(e) => update("shadowStrength", Number(e.target.value))}
                />
                <span className="val">{settings.shadowStrength}%</span>
              </div>
            </div>

            <div className="divider" />
            <BackgroundSettings dock={dock} roomId={roomId} controllerId={controllerId} />

            <div className="divider" />
            <span className="section-label">Advanced — Transitions</span>
            <div className="srow">
              <span>Style</span>
              <select className="compact" value={settings.transition} onChange={(e) => update("transition", e.target.value as TransitionStyle)}>
                <option value="fade">Fade</option>
                <option value="cut">Cut</option>
              </select>
            </div>

            <div className="divider" />
            <span className="section-label">Advanced — Keyboard</span>
            <div className="hint">
              <kbd>←</kbd> <kbd>↑</kbd> previous · <kbd>→</kbd> <kbd>↓</kbd> <kbd>Space</kbd> next
              <br />
              <kbd>Esc</kbd> clears the screen
              <br />
              Shortcuts pause while you are typing in a field.
            </div>

            <div className="divider" />
            <button className="btn-ghost wide" onClick={() => pushSettings(LYRICS_DEFAULTS)}>
              Reset display to defaults
            </button>
          </>
        )}
      </div>
    </div>
  )
}
