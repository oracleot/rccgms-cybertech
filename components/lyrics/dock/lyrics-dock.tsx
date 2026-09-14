"use client"

/**
 * The Lyrics/Prayer Points OBS dock. Simple shows only what a live service
 * needs — set/item picking, Prev/Next, Clear, Manual/Auto, Lock. Advanced
 * adds set creation, safe margins, typography and transitions. Both read the
 * same useLyricsDock state; Simple just hides secondary controls.
 */

import { useState } from "react"
import * as Tooltip from "@radix-ui/react-tooltip"
import { Lock, LockOpen, Music2, RotateCcw, Settings, Trash2 } from "lucide-react"
import { LyricsDockStyles } from "./dock-styles"
import { ItemList } from "./item-list"
import { LyricsSettingsPanel } from "./settings-panel"
import { Tip } from "./tip"
import { useLyricsDock } from "./use-dock"
import type { ContentType } from "@/lib/lyrics/types"

export function LyricsDock() {
  const dock = useLyricsDock()
  const [view, setView] = useState<"main" | "settings">("main")
  const [newTitle, setNewTitle] = useState("")
  const [newType, setNewType] = useState<ContentType>("lyrics")
  const [newRaw, setNewRaw] = useState("")
  const [pairTranslation, setPairTranslation] = useState(false)
  const advanced = dock.uiMode === "advanced"

  const { activeSet, onScreen, staged } = dock

  const handleCreate = () => {
    if (!newRaw.trim()) return
    dock.createSet(newTitle, newType, newRaw, { pairTranslation })
    setNewTitle("")
    setNewRaw("")
  }

  return (
    <Tooltip.Provider>
      <LyricsDockStyles />
      <div className={`dock${dock.locked ? " is-locked" : ""}`}>
        {view === "main" ? (
          <div className="pane">
            <span className="section-label">Song / Prayer set</span>
            <select value={activeSet?.id ?? ""} onChange={(e) => dock.selectSet(e.target.value)}>
              <option value="" disabled>
                {dock.sets.length ? "Choose a set…" : "No sets yet — create one in Advanced"}
              </option>
              {dock.sets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.type === "prayer" ? "Prayer — " : "Lyrics — "}
                  {s.title} ({s.groups.length})
                </option>
              ))}
            </select>

            {staged && (
              <div className="preview">
                <div className="preview-head">
                  <span className="preview-title">
                    Preview{dock.locked && <span className="pill-locked">LOCKED</span>}
                  </span>
                  <button className="btn-primary" onClick={dock.goLive} disabled={dock.locked}>
                    Go live
                  </button>
                </div>
                <div className="preview-text">{staged.group.primary}</div>
              </div>
            )}

            <div className="now-playing">
              <div className="now-title">{onScreen ? onScreen.setTitle : "Nothing live"}</div>
              {onScreen && (
                <>
                  <div className="now-primary">{onScreen.group.primary}</div>
                  {onScreen.group.secondary && <div className="now-secondary">{onScreen.group.secondary}</div>}
                  <div className="now-idx">
                    {onScreen.index + 1} / {onScreen.total}
                  </div>
                </>
              )}
            </div>

            <div className="nav-row">
              <button className="btn-ghost" onClick={dock.prev} disabled={!dock.canPrev}>
                ◀ Prev
              </button>
              <button className="btn-ghost" onClick={dock.next} disabled={!dock.canNext}>
                Next ▶
              </button>
            </div>

            <div className="auto-row">
              {!dock.autoOn ? (
                <>
                  <span>Every</span>
                  <input
                    type="number"
                    min={1}
                    max={600}
                    value={dock.autoInterval}
                    onChange={(e) => dock.setAutoInterval(Number(e.target.value))}
                  />
                  <span>sec</span>
                  <button className="btn-ghost" onClick={dock.startAuto} disabled={!activeSet || dock.locked}>
                    Start Auto
                  </button>
                </>
              ) : (
                <>
                  <span className={`status-pill${dock.autoPaused ? "" : " on"}`}>
                    {!dock.autoPaused && <span className="dot" />}
                    {dock.autoPaused ? "Paused" : "Auto"}
                  </span>
                  {dock.autoPaused ? (
                    <button className="btn-ghost" onClick={dock.resumeAuto}>
                      Resume
                    </button>
                  ) : (
                    <button className="btn-ghost" onClick={dock.pauseAuto}>
                      Pause
                    </button>
                  )}
                  <button className="btn-ghost" onClick={dock.stopAuto}>
                    Stop
                  </button>
                </>
              )}
            </div>

            {onScreen && (
              <button className="btn-clear" onClick={dock.clear} disabled={dock.locked}>
                Clear Screen
              </button>
            )}

            <div className="divider" />
            <div className="item-section">
              <span className="section-label">Items</span>
              <ItemList dock={dock} />
            </div>

            {advanced && (
              <>
                <div className="divider" />
                <span className="section-label">New set</span>
                <div className="row">
                  <input type="text" placeholder="Title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
                  <div className="type-toggle">
                    <button className={newType === "lyrics" ? "active" : ""} onClick={() => setNewType("lyrics")}>
                      Lyrics
                    </button>
                    <button className={newType === "prayer" ? "active" : ""} onClick={() => setNewType("prayer")}>
                      Prayer
                    </button>
                  </div>
                </div>
                {newType === "lyrics" && (
                  <label className="srow">
                    <span>Every other line is a translation</span>
                    <input type="checkbox" checked={pairTranslation} onChange={(e) => setPairTranslation(e.target.checked)} />
                  </label>
                )}
                <textarea
                  placeholder={
                    newType === "prayer"
                      ? "Paste a numbered or bulleted list of prayer points…"
                      : "Paste the full song — blank line between slides…"
                  }
                  value={newRaw}
                  onChange={(e) => setNewRaw(e.target.value)}
                />
                <button className="btn-primary" onClick={handleCreate} disabled={!newRaw.trim()}>
                  Split into items
                </button>
                {activeSet && (
                  <button className="btn-ghost wide" onClick={() => dock.deleteSet(activeSet.id)}>
                    <Trash2 style={{ height: 12, width: 12, marginRight: 5, verticalAlign: -2 }} />
                    Delete &ldquo;{activeSet.title}&rdquo;
                  </button>
                )}
                <div className="hint">Full editing, reordering and merging lives on the /lyrics management page.</div>
              </>
            )}
          </div>
        ) : (
          <LyricsSettingsPanel dock={dock} />
        )}

        <div className="toolbar">
          <Tip label="Lyrics / Prayer Points">
            <button className={`tool-btn${view === "main" ? " active" : ""}`} onClick={() => setView("main")} aria-label="Main">
              <Music2 />
            </button>
          </Tip>
          <span className="tool-spacer" />
          {advanced && (
            <Tip label="Undo last live change">
              <button className="tool-btn" onClick={dock.undo} disabled={!dock.canUndo || dock.locked} aria-label="Undo">
                <RotateCcw />
              </button>
            </Tip>
          )}
          <Tip label={dock.locked ? "Unlock live display" : "Lock live display — blocks every change"}>
            <button
              className={`tool-btn${dock.locked ? " locked" : ""}`}
              onClick={() => dock.setLocked(!dock.locked)}
              aria-label={dock.locked ? "Unlock" : "Lock"}
              aria-pressed={dock.locked}
            >
              {dock.locked ? <Lock /> : <LockOpen />}
            </button>
          </Tip>
          <Tip label="Settings — interface mode, safe area, typography">
            <button className={`tool-btn${view === "settings" ? " active" : ""}`} onClick={() => setView("settings")} aria-label="Settings">
              <Settings />
            </button>
          </Tip>
        </div>
      </div>
    </Tooltip.Provider>
  )
}
