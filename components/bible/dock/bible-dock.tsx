"use client"

/**
 * The OBS dock. Only what an operator reaches for repeatedly is on the main
 * pane; everything else sits behind an icon in the bottom toolbar.
 */

import { useState } from "react"
import * as Tooltip from "@radix-ui/react-tooltip"
import { BookOpen, Lock, LockOpen, RotateCcw, Settings } from "lucide-react"
import { TRANSLATIONS, type TranslationId } from "@/lib/bible/fetch-passage"
import { DockStyles } from "./dock-styles"
import { ReferenceInput } from "./reference-input"
import { VerseList } from "./verse-list"
import { NavPopover } from "./nav-popover"
import { HistoryPopover } from "./history-popover"
import { AudioPopover } from "./audio-popover"
import { PreviewCard } from "./preview-card"
import { SettingsPanel } from "./settings-panel"
import { Tip } from "./tip"
import { useDock } from "./use-dock"

export function BibleDock() {
  const dock = useDock()
  const [view, setView] = useState<"bible" | "settings">("bible")

  return (
    <Tooltip.Provider>
      <DockStyles />
      <div className={`dock${dock.locked ? " is-locked" : ""}`}>
        {view === "bible" ? (
          <div className="pane">
            <ReferenceInput
              busy={dock.busy}
              canSend={dock.canSend}
              stagingOnly={dock.stagingOnly}
              translation={dock.translation}
              onSend={(t) => void dock.send(t)}
            />
            {dock.error && <div className="error-msg">{dock.error}</div>}

            <select
              value={dock.translation}
              onChange={(e) => dock.changeTranslation(e.target.value as TranslationId)}
              disabled={dock.busy}
              aria-label="Translation"
            >
              {TRANSLATIONS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            <PreviewCard dock={dock} />

            <div className="divider" />
            <VerseList dock={dock} />

            {dock.onScreen && (
              <button className="btn-clear" onClick={() => dock.clear()} disabled={dock.locked}>
                Clear Screen
              </button>
            )}
          </div>
        ) : (
          <SettingsPanel dock={dock} />
        )}

        <div className="toolbar">
          <Tip label="Bible">
            <button className={`tool-btn${view === "bible" ? " active" : ""}`} onClick={() => setView("bible")} aria-label="Bible">
              <BookOpen />
            </button>
          </Tip>
          <NavPopover dock={dock} />
          <HistoryPopover dock={dock} />
          <AudioPopover dock={dock} />
          <span className="tool-spacer" />
          <Tip label="Undo last live change">
            <button className="tool-btn" onClick={dock.undo} disabled={!dock.canUndo || dock.locked} aria-label="Undo">
              <RotateCcw />
            </button>
          </Tip>
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
          <Tip label="Settings — display, appearance, shortcuts">
            <button className={`tool-btn${view === "settings" ? " active" : ""}`} onClick={() => setView("settings")} aria-label="Settings">
              <Settings />
            </button>
          </Tip>
        </div>
      </div>
    </Tooltip.Provider>
  )
}
