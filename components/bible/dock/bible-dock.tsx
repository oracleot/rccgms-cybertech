"use client"

/**
 * The OBS dock. Only what an operator reaches for repeatedly is on the main
 * pane; everything else sits behind an icon in the bottom toolbar.
 */

import { useState } from "react"
import * as Tooltip from "@radix-ui/react-tooltip"
import { BookOpen, Settings } from "lucide-react"
import { TRANSLATIONS, type TranslationId } from "@/lib/bible/fetch-passage"
import { DockStyles } from "./dock-styles"
import { ReferenceInput } from "./reference-input"
import { VerseList } from "./verse-list"
import { NavPopover } from "./nav-popover"
import { SettingsPanel } from "./settings-panel"
import { Tip } from "./tip"
import { useDock } from "./use-dock"

export function BibleDock() {
  const dock = useDock()
  const [view, setView] = useState<"bible" | "settings">("bible")

  return (
    <Tooltip.Provider>
      <DockStyles />
      <div className="dock">
        {view === "bible" ? (
          <div className="pane">
            <ReferenceInput busy={dock.busy} onSend={(t) => void dock.send(t)} />
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

            <div className="divider" />
            <VerseList dock={dock} />

            {dock.onScreen && (
              <button className="btn-clear" onClick={dock.clear}>
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
          <span className="tool-spacer" />
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
