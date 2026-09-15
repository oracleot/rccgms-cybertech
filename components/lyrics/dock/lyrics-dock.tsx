"use client"

/**
 * The Lyrics/Prayer Points OBS dock. Simple shows only what a live service
 * needs — set/item picking, Prev/Next, Clear, Manual/Auto, Lock. Advanced
 * adds set creation, safe margins, typography and transitions. Both read the
 * same useLyricsDock state; Simple just hides secondary controls.
 */

import { useEffect, useRef, useState } from "react"
import * as Tooltip from "@radix-ui/react-tooltip"
import { ExternalLink, Lock, LockOpen, Music2, RotateCcw, Settings } from "lucide-react"
import { LyricsDockStyles } from "./dock-styles"
import { ItemList } from "./item-list"
import { LyricsSettingsPanel } from "./settings-panel"
import { Tip } from "./tip"
import { useLyricsDock } from "./use-dock"

/**
 * The management page has to be opened in the operator's *normal* browser,
 * not from in here.
 *
 * This dock runs inside OBS's embedded Chromium, which keeps its own cookie
 * store, entirely separate from Chrome/Edge. A target="_blank" link just
 * opens another OBS-owned window, and signing in there is a dead end: the
 * magic-link email gets opened in the real browser, so the session lands in
 * the real browser and the OBS window stays on the login screen forever.
 *
 * So instead of a link that leads somewhere useless, this hands over the URL
 * to paste. Clipboard access needs a secure context, which a dock served over
 * plain http on a LAN address isn't, so the URL is also shown in a read-only
 * field the operator can select by hand when the copy fails.
 */
function ManageLibraryLink() {
  // "selected" is the honest outcome when the browser refuses clipboard
  // access: the URL is highlighted and Ctrl+C will work, which is worth
  // saying rather than leaving the button looking like it did nothing.
  const [status, setStatus] = useState<"idle" | "copied" | "selected">("idle")
  const inputRef = useRef<HTMLInputElement>(null)

  // Filled in after mount rather than during render: window.location doesn't
  // exist server-side, and writing the field directly avoids both a
  // hydration mismatch and a state round trip.
  useEffect(() => {
    if (inputRef.current) inputRef.current.value = `${window.location.origin}/lyrics`
  }, [])

  async function copy() {
    // Select first, so the fallback is already in place whichever path wins.
    inputRef.current?.focus()
    inputRef.current?.select()
    let ok = false
    try {
      await navigator.clipboard.writeText(inputRef.current?.value ?? "/lyrics")
      ok = true
    } catch {
      // Clipboard API needs a secure context; a dock served over plain http
      // on a LAN address doesn't get one. execCommand is the older path.
      try {
        ok = document.execCommand("copy")
      } catch {
        ok = false
      }
    }
    setStatus(ok ? "copied" : "selected")
    window.setTimeout(() => setStatus("idle"), 6000)
  }

  const label =
    status === "copied"
      ? "Copied — paste it into your browser"
      : status === "selected"
        ? "Selected below — press Ctrl+C to copy"
        : "Copy the manage-songs link (/lyrics)"

  return (
    <>
      <button className="btn-ghost wide" onClick={copy}>
        <ExternalLink style={{ height: 12, width: 12, marginRight: 5, verticalAlign: -2 }} />
        {label}
      </button>
      <input ref={inputRef} className="url-field" defaultValue="/lyrics" readOnly onFocus={(e) => e.target.select()} />
      <div className="hint">
        Open this in Chrome or Edge, not in OBS — signing in needs the same browser you read
        your email in. Create, edit, reorder and delete sets there; changes appear here
        automatically.
      </div>
    </>
  )
}

export function LyricsDock() {
  const dock = useLyricsDock()
  const [view, setView] = useState<"main" | "settings">("main")
  const advanced = dock.uiMode === "advanced"

  const { activeSet, onScreen, staged } = dock

  return (
    <Tooltip.Provider>
      <LyricsDockStyles />
      <div className={`dock${dock.locked ? " is-locked" : ""}`}>
        {view === "main" ? (
          <div className="pane">
            <span className="section-label">Song / Prayer set</span>
            <select value={activeSet?.id ?? ""} onChange={(e) => dock.selectSet(e.target.value)}>
              <option value="" disabled>
                {dock.sets.length ? "Choose a set…" : "No sets yet — create one at /lyrics"}
              </option>
              {dock.sets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.type === "prayer" ? "Prayer — " : "Lyrics — "}
                  {s.title} ({s.groups.length})
                </option>
              ))}
            </select>
            {dock.setsError && <div className="error-msg">{dock.setsError}</div>}

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
                {/* Creating/editing/deleting sets happens on /lyrics, not here — the dock
                    has no login session (an OBS Browser Source can't authenticate), and
                    only signed-in staff can write to the shared library. The dock only
                    ever reads it. */}
                <ManageLibraryLink />
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
