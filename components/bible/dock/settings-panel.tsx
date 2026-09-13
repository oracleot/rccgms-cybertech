"use client"

import { TRANSLATIONS, type TranslationId } from "@/lib/bible/fetch-passage"
import { SCENE_DEFAULTS, type SceneSettings } from "@/lib/bible/scene-settings"
import type { Dock } from "./use-dock"

export function SettingsPanel({ dock }: { dock: Dock }) {
  const { settings, updateSetting: update, pushSettings, translation, changeTranslation } = dock

  return (
    <div className="pane">
      <span className="section-label">Settings</span>
      <div className="settings">
        <span className="section-label">Display</span>
        <div className="srow">
          <span>Display mode</span>
          <select className="compact" value={settings.mode} onChange={(e) => update("mode", e.target.value as SceneSettings["mode"])}>
            <option value="auto">Auto</option>
            <option value="single">Single verse</option>
            <option value="multi">Multi-verse</option>
          </select>
        </div>
        <div className="hint">
          Auto keeps type comfortable and pages when needed. Multi-verse fits as many verses as it can before paging.
          Single shows one verse at a time.
        </div>

        <div className="srow">
          <span>Style</span>
          <select className="compact" value={settings.style} onChange={(e) => update("style", e.target.value as SceneSettings["style"])}>
            <option value="text">Text only</option>
            <option value="card">Lower-third card</option>
          </select>
        </div>

        <div className="srow">
          <span>Background</span>
          <div className="ctl">
            <input type="color" value={settings.bgColor} onChange={(e) => update("bgColor", e.target.value)} />
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(settings.bgOpacity * 100)}
              onChange={(e) => update("bgOpacity", Number(e.target.value) / 100)}
            />
            <span className="val">{Math.round(settings.bgOpacity * 100)}%</span>
          </div>
        </div>
        <div className="hint">0% is fully transparent, so your scene background shows through.</div>

        <div className="srow">
          <span>Text position</span>
          <select className="compact" value={settings.pos} onChange={(e) => update("pos", e.target.value as SceneSettings["pos"])}>
            <option value="top">Top</option>
            <option value="center">Centre</option>
            <option value="bottom">Bottom</option>
          </select>
        </div>

        <div className="srow">
          <span>Text size</span>
          <div className="ctl">
            <input
              type="range"
              min={50}
              max={150}
              step={5}
              value={Math.round(settings.scale * 100)}
              onChange={(e) => update("scale", Number(e.target.value) / 100)}
            />
            <span className="val">{Math.round(settings.scale * 100)}%</span>
          </div>
        </div>
        <div className="hint">Text auto-fits the source. This sets how large it may go, and how small before a passage pages.</div>

        <div className="srow">
          <span>Reference</span>
          <select className="compact" value={settings.refPos} onChange={(e) => update("refPos", e.target.value as SceneSettings["refPos"])}>
            <option value="top">Above text</option>
            <option value="bottom">Below text</option>
            <option value="hide">Hidden</option>
          </select>
        </div>

        <div className="srow">
          <span>Font</span>
          <select className="compact" value={settings.serif ? "serif" : "sans"} onChange={(e) => update("serif", e.target.value === "serif")}>
            <option value="serif">Serif</option>
            <option value="sans">Sans</option>
          </select>
        </div>

        <div className="srow">
          <span>Text colour</span>
          <input type="color" value={settings.color} onChange={(e) => update("color", e.target.value)} />
        </div>
        <div className="srow">
          <span>Reference colour</span>
          <input type="color" value={settings.accent} onChange={(e) => update("accent", e.target.value)} />
        </div>
        <div className="srow">
          <span>Drop shadow</span>
          <input type="checkbox" checked={settings.shadow} onChange={(e) => update("shadow", e.target.checked)} />
        </div>
        <div className="srow">
          <span>Show translation</span>
          <input type="checkbox" checked={settings.showTranslation} onChange={(e) => update("showTranslation", e.target.checked)} />
        </div>
        <div className="srow">
          <span>Inline verse number</span>
          <input type="checkbox" checked={settings.inlineNumber} onChange={(e) => update("inlineNumber", e.target.checked)} />
        </div>
        <div className="hint">Single-verse only — puts the number in front of the text, like ³ And God said… Multi-verse always numbers each verse.</div>

        <div className="divider" />
        <span className="section-label">Dock</span>
        <div className="srow">
          <span>Default translation</span>
          <select className="compact" value={translation} onChange={(e) => changeTranslation(e.target.value as TranslationId)}>
            {TRANSLATIONS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.id.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <div className="divider" />
        <span className="section-label">Keyboard</span>
        <div className="hint">
          <kbd>←</kbd> <kbd>→</kbd> previous / next verse or page
          <br />
          <kbd>Shift</kbd> + arrows previous / next chapter
          <br />
          <kbd>Alt</kbd> + arrows previous / next book
          <br />
          <kbd>Enter</kbd> in the reference field sends · <kbd>Tab</kbd> completes a book name · <kbd>Esc</kbd> clears
          <br />
          Shortcuts pause while you are typing in a field.
        </div>

        <div className="divider" />
        <button className="btn-ghost wide" onClick={() => pushSettings(SCENE_DEFAULTS)}>
          Reset display to defaults
        </button>
      </div>
    </div>
  )
}
