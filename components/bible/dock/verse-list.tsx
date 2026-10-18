"use client"

import { useEffect, useRef } from "react"
import { Star } from "lucide-react"
import { rangeReference, verseId, verseLabel } from "@/lib/bible/format"
import type { Dock } from "./use-dock"

export function VerseList({ dock, advanced }: { dock: Dock; advanced: boolean }) {
  const { verses, shown, heading, isShowing, firstShowingIdx, canPrev, canNext, nav, selectVerse, locked, onScreen } = dock
  const activeRef = useRef<HTMLButtonElement>(null)
  const selectedIds = new Set((onScreen?.verses ?? []).map(verseId))
  const selectedVerses = onScreen?.verses ?? []
  const selectedIndices = selectedVerses.map((verse) => verses.findIndex((item) => verseId(item) === verseId(verse)))
  const selectedIsContiguous = selectedIndices.every((index, i) => i === 0 || index === selectedIndices[i - 1] + 1)
  const selectedReference = selectedIsContiguous ? rangeReference(selectedVerses) : null

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [firstShowingIdx])

  return (
    <div className="verse-section">
      <div className="verse-head">
        <span className="section-label">
          {heading ?? "Verses"}
          {shown && shown.pages > 1 && (
            <span className="page-ind">
              {shown.page + 1}/{shown.pages}
            </span>
          )}
          {locked && <span className="pill-locked">Locked</span>}
        </span>
        <div className="nav-group">
          {onScreen && advanced && (
            <button
              className={`nav-btn star${dock.currentIsFavourite ? " on" : ""}`}
              onClick={dock.favouriteCurrent}
              title={dock.currentIsFavourite ? "Unpin from favourites" : "Pin to favourites"}
              aria-pressed={dock.currentIsFavourite}
            >
              <Star />
            </button>
          )}
          <button className="nav-btn" onClick={() => nav(-1)} disabled={!canPrev} title="Previous (←)">
            ←
          </button>
          <button className="nav-btn" onClick={() => nav(1)} disabled={!canNext} title="Next (→)">
            →
          </button>
        </div>
      </div>

      {onScreen && (
        <div className="verse-selection-summary" aria-live="polite">
          <span>{selectedVerses.length} included{selectedReference ? ` · ${selectedReference}` : ""}</span>
          <span className="selection-legend"><i className="selection-check">✓</i> Included <i className="shown-marker" /> On screen</span>
        </div>
      )}
      {onScreen && verses.length > 1 && (
        <div className="hint range-hint">Click a verse, then Shift-click another to select the full range.</div>
      )}

      {verses.length > 0 ? (
        <div className="verse-list">
          {verses.map((v, i) => {
            const active = isShowing(v, i)
            const selected = selectedIds.has(verseId(v))
            return (
              <button
                key={verseId(v)}
                ref={active && i === firstShowingIdx ? activeRef : undefined}
                className={`verse-item${active ? " active" : ""}${selected ? " selected" : ""}`}
                onClick={(event) => selectVerse(v, event.shiftKey)}
                disabled={locked}
                aria-pressed={selected}
                title={`${selected ? "Remove" : "Include"} ${verseLabel(v)} ${selected ? "from" : "in"} the displayed passage`}
              >
                <span className="verse-check" aria-hidden="true">{selected ? "✓" : ""}</span>
                <span className="verse-num">{verseLabel(v)}</span>
                <span>{v.text}</span>
              </button>
            )
          })}
        </div>
      ) : (
        <div className="empty">Nothing on screen</div>
      )}
    </div>
  )
}
