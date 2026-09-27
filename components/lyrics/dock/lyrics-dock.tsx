"use client"

/**
 * The Lyrics/Prayer Points OBS dock. Simple shows only what a live service
 * needs — set/item picking, Prev/Next, Clear, Manual/Auto, Lock. Advanced
 * adds set creation, safe margins, typography and transitions. Both read the
 * same useLyricsDock state; Simple just hides secondary controls.
 */

import { useState } from "react"
import * as Tooltip from "@radix-ui/react-tooltip"
import { Lock, LockOpen, Music2, Radio, RotateCcw, Settings } from "lucide-react"
import { LyricsDockStyles } from "./dock-styles"
import { ItemList } from "./item-list"
import { SetPicker } from "./set-picker"
import { LyricsSettingsPanel } from "./settings-panel"
import { RoomGate } from "./room-panel"
import { SessionPanel } from "./session-panel"
import { Tip } from "./tip"
import { useLyricsDock } from "./use-dock"
import { useRoomSelection } from "../use-room-selection"
import { useRoomPresence } from "../use-room-presence"

/**
 * Entry point for the OBS dock. The dock URL is permanent (`/lyrics/obs/dock`,
 * no ?room=): it reconnects to the last room this browser used, or — without
 * one — shows Create-or-Join. It never joins a shared channel. Switching rooms
 * happens here, never by editing the OBS URL.
 */
export function LyricsDockApp() {
  const { room, ready, join, leave } = useRoomSelection()

  if (!ready) return null
  if (!room) {
    return (
      <Tooltip.Provider>
        <LyricsDockStyles />
        <div className="dock">
          <RoomGate onJoin={join} />
        </div>
      </Tooltip.Provider>
    )
  }
  // key={room} remounts the dock on a room switch, so no live/session state
  // from the previous room can linger.
  return <LyricsDock key={room} roomId={room} onLeave={leave} />
}

function LyricsDock({ roomId, onLeave }: { roomId: string; onLeave: () => void }) {
  const presence = useRoomPresence(roomId, "dock")
  const dock = useLyricsDock(roomId, presence.isController)
  const [view, setView] = useState<"main" | "settings" | "session">("main")
  const advanced = dock.uiMode === "advanced"
  const standby = !presence.isController

  const { activeSet, onScreen, staged } = dock

  return (
    <Tooltip.Provider>
      <LyricsDockStyles />
      <div className={`dock${dock.locked ? " is-locked" : ""}`}>
        {standby && view !== "session" && (
          <div className="standby-banner">
            <span>
              Standby — {controllerName(presence)} has control
            </span>
            <button onClick={presence.takeControl}>Take control</button>
          </div>
        )}
        {view === "main" ? (
          <div className="pane">
            <span className="section-label">Song / Prayer set</span>
            <SetPicker sets={dock.sets} activeId={activeSet?.id ?? null} onSelect={dock.selectSet} />
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

          </div>
        ) : view === "session" ? (
          <SessionPanel roomId={roomId} presence={presence} onLeave={onLeave} />
        ) : (
          <LyricsSettingsPanel dock={dock} roomId={roomId} controllerId={presence.isController ? presence.participantId : null} />
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
              disabled={standby}
              aria-label={dock.locked ? "Unlock" : "Lock"}
              aria-pressed={dock.locked}
            >
              {dock.locked ? <Lock /> : <LockOpen />}
            </button>
          </Tip>
          <Tip label="Broadcast session — ID, participants, controller">
            <button
              className={`tool-btn${view === "session" ? " active" : ""}${standby ? " standby" : ""}`}
              onClick={() => setView("session")}
              aria-label="Broadcast session"
            >
              <Radio />
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

/** The label of the dock that currently holds control, for the standby banner. */
function controllerName(presence: ReturnType<typeof useRoomPresence>): string {
  const c = presence.participants.find((p) => p.participantId === presence.controllerId)
  return c ? c.label : "another dock"
}
